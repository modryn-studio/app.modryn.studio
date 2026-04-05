'use server';

import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import sql from '@/lib/db';
import { env } from '@/lib/env';

export async function signUpWithEmail(_prevState: { error: string } | null, formData: FormData) {
  const name = formData.get('name') as string;
  const email = (formData.get('email') as string).trim().toLowerCase();
  const password = formData.get('password') as string;
  const token = (formData.get('token') as string | null) || null;

  const isAdminEmail = email === env.ADMIN_EMAIL.toLowerCase();

  // Non-admin accounts require a valid invite token.
  // Atomically claim the invite before account creation to prevent concurrent
  // redemption of the same token by two simultaneous requests (TOCTOU).
  if (!isAdminEmail) {
    if (!token) {
      return { error: 'An invitation is required to create an account.' };
    }

    const [claimed] = await sql`
      UPDATE invites
      SET used_at = now()
      WHERE token = ${token}
        AND used_at IS NULL
        AND expires_at > now()
        AND (email IS NULL OR lower(email) = ${email})
      RETURNING token
    `;

    if (!claimed) {
      return { error: 'Invalid or expired invitation.' };
    }
  }

  const { data, error } = await auth.signUp.email({ name, email, password });

  if (error) {
    // Release the invite claim so the user can retry with the same token
    if (!isAdminEmail && token) {
      await sql`UPDATE invites SET used_at = NULL WHERE token = ${token}`;
    }
    return { error: error.message || 'Failed to create account.' };
  }

  const userId = data?.user?.id;
  if (!userId) {
    if (!isAdminEmail && token) {
      await sql`UPDATE invites SET used_at = NULL WHERE token = ${token}`;
    }
    return { error: 'Account created but session could not be established.' };
  }

  // Assign role
  const role = isAdminEmail ? 'admin' : 'member';
  await sql`
    INSERT INTO user_roles (user_id, role) VALUES (${userId}, ${role})
    ON CONFLICT (user_id) DO NOTHING
  `;

  // Wire the invite to the user who redeemed it
  if (!isAdminEmail && token) {
    await sql`
      UPDATE invites SET used_by = ${userId} WHERE token = ${token}
    `;
  }

  redirect('/');
}

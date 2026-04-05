'use client';

import { useState, useEffect } from 'react';

type Role = 'admin' | 'member';

export function useRole() {
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { role?: Role } | null) => {
        if (data?.role) setRole(data.role);
      })
      .catch(() => null)
      .finally(() => setIsLoading(false));
  }, []);

  return { role, isAdmin: role === 'admin', isLoading };
}

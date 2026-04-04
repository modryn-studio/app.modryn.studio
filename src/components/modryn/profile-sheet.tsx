'use client';

import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import Image from 'next/image';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { Profile } from '@/lib/use-profile';
import { cn } from '@/lib/utils';
import { ChromeLabel } from '@/components/modryn/chrome-label';

interface ProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  save: (updates: Partial<Omit<Profile, 'initials'>>) => void;
}

function EditableText({
  value,
  onSave,
  placeholder,
  className,
  multiline,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder: string;
  className?: string;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== value) onSave(trimmed);
  }

  if (editing) {
    const shared = {
      autoFocus: true,
      value: draft,
      placeholder,
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !multiline) {
          e.preventDefault();
          commit();
        }
        if (e.key === 'Escape') {
          setDraft(value);
          setEditing(false);
        }
      },
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(e.target.value),
      className: cn(
        'w-full bg-transparent text-sidebar-primary outline-none border-b border-sidebar-ring caret-sidebar-primary',
        className
      ),
    };
    return multiline ? <textarea rows={3} {...shared} /> : <input {...shared} />;
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      onKeyDown={(e) => e.key === 'Enter' && setEditing(true)}
      className={cn(
        'hover:text-sidebar-primary cursor-text rounded px-0 transition-colors select-text',
        value ? 'text-sidebar-foreground' : 'text-sidebar-muted italic',
        className
      )}
    >
      {value || placeholder}
    </span>
  );
}

export function ProfileSheet({ open, onOpenChange, profile, save }: ProfileSheetProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => save({ avatarDataUrl: reader.result as string });
    reader.readAsDataURL(file);
    // reset so same file can be re-picked
    e.target.value = '';
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="border-sidebar-border bg-sidebar w-80 border-l p-0">
        <SheetHeader className="border-sidebar-border border-b px-6 py-5">
          <SheetTitle className="text-sidebar-muted text-[13px] font-medium tracking-widest uppercase">
            Profile
          </SheetTitle>
        </SheetHeader>

        <div className="px-6 pt-8 pb-6">
          {/* Avatar */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="group relative"
              aria-label="Change profile photo"
            >
              {profile.avatarDataUrl ? (
                <Image
                  src={profile.avatarDataUrl}
                  alt={profile.name}
                  width={80}
                  height={80}
                  unoptimized
                  className="ring-sidebar-border h-20 w-20 rounded-sm object-cover ring-2"
                />
              ) : (
                <div className="bg-sidebar-accent text-sidebar-foreground ring-sidebar-border flex h-20 w-20 items-center justify-center rounded-sm font-mono text-xl font-semibold ring-2">
                  {profile.initials}
                </div>
              )}
              <div className="bg-sidebar/72 absolute inset-0 flex items-center justify-center rounded-sm opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="text-sidebar-foreground h-5 w-5" strokeWidth={1.5} />
              </div>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Fields */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <ChromeLabel as="label" className="text-sidebar-muted">
                Name
              </ChromeLabel>
              <EditableText
                value={profile.name}
                placeholder="Your name"
                onSave={(v) => save({ name: v })}
                className="text-[15px] font-medium"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <ChromeLabel as="label" className="text-sidebar-muted">
                Description
              </ChromeLabel>
              <EditableText
                value={profile.description}
                placeholder="A line about you or your focus"
                onSave={(v) => save({ description: v })}
                className="text-[13px] leading-relaxed"
                multiline
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

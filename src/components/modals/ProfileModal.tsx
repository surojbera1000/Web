import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Modal } from '@/components/common/Modal';
import { Avatar } from '@/components/common/Avatar';
import { LogoutIcon, PhoneIcon } from '@/components/common/Icon';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { user, updateProfile, signOut } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && user) {
      setName(user.name);
      setBio(user.bio ?? '');
    }
  }, [open, user]);

  if (!user) return null;

  async function handleSave() {
    setSaving(true);
    try {
      await updateProfile({ name: name.trim() || user!.name, bio: bio.trim() });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="My Profile"
      footer={
        <div className="flex gap-2">
          <button
            onClick={() => void signOut()}
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium text-red-500 transition hover:bg-red-500/10"
          >
            <LogoutIcon width={20} height={20} />
            Log Out
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl bg-tg-blue py-3 font-medium text-white transition hover:bg-tg-blue-dark disabled:opacity-50"
          >
            Save
          </button>
        </div>
      }
    >
      <div className="flex flex-col items-center px-5 py-6">
        <Avatar name={name || user.name} size={96} />
        <div className="mt-6 w-full space-y-4">
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-transparent px-4 py-3 outline-none focus:border-tg-blue dark:border-gray-600"
            />
          </Field>
          <Field label="Bio">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder="A few words about you"
              className="tg-scroll w-full resize-none rounded-xl border border-gray-300 bg-transparent px-4 py-3 outline-none focus:border-tg-blue dark:border-gray-600"
            />
          </Field>
          <div className="flex items-center gap-3 rounded-xl bg-tg-hover-light px-4 py-3 dark:bg-tg-hover-dark">
            <PhoneIcon width={20} height={20} className="text-tg-text-secondary-light dark:text-tg-text-secondary-dark" />
            <div>
              <p className="text-sm">{user.phone}</p>
              <p className="text-xs text-tg-text-secondary-light dark:text-tg-text-secondary-dark">Phone number</p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-tg-blue">{label}</span>
      {children}
    </label>
  );
}

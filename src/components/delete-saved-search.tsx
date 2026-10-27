'use client';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { api } from '@/components/use-api';

export function DeleteSavedSearch({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      className="btn btn-ghost btn-sm text-danger"
      aria-label="Delete saved search"
      onClick={async () => {
        await api(`/api/saved-searches/${id}`, 'DELETE').catch(() => undefined);
        router.refresh();
      }}
    >
      <Trash2 size={14} aria-hidden="true" />
    </button>
  );
}

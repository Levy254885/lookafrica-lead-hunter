'use client';
import { Alert } from '@/components/ui';

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-xl space-y-3">
      <Alert kind="bad">This page could not be loaded. The most common cause is a Firestore index that has not been created yet. Operators: open /api/health?key=YOUR_CRON_SECRET, which lists any missing index with a one-click link to create it.</Alert>
      <button className="btn" onClick={reset}>Try again</button>
    </div>
  );
}

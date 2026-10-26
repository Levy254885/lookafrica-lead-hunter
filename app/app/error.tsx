'use client';
import { Alert } from '@/components/ui';

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-xl space-y-3">
      <Alert kind="bad">This page could not be loaded. If the problem continues, check that Firebase is configured and reachable.</Alert>
      <button className="btn" onClick={reset}>Try again</button>
    </div>
  );
}

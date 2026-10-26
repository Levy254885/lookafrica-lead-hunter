export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="space-y-3">
      <div className="h-7 w-48 rounded bg-subtle" />
      <div className="h-32 rounded-lg bg-subtle" />
    </div>
  );
}

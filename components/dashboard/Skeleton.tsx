import React from 'react';

/**
 * Grey pulsing placeholder for a number, month or date that has not loaded yet.
 * Titles and fixed labels stay as normal text; only the data is replaced.
 */
export function Skeleton({ className = 'h-3 w-12' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block align-middle animate-pulse rounded-md bg-slate-200 ${className}`}
    />
  );
}

/** Shows `children` when ready, otherwise a skeleton block of the given size. */
export function SkeletonOr({
  ready,
  className,
  children,
}: {
  ready: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return ready ? <>{children}</> : <Skeleton className={className} />;
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando stock</span>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="skeleton h-8 w-52" />
          <div className="skeleton h-4 w-72" />
        </div>
        <div className="flex gap-8">
          <div className="flex flex-col gap-2">
            <div className="skeleton h-4 w-28" />
            <div className="skeleton h-8 w-24" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-8 w-16" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="skeleton h-6 w-44" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
            >
              <div className="flex items-center justify-between">
                <div className="skeleton h-5 w-28" />
                <div className="skeleton h-7 w-24" />
              </div>
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-5/6" />
              <div className="skeleton h-3 w-2/3" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="skeleton h-6 w-36" />
        <div className="skeleton h-16 w-full" />
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <div className="skeleton h-6 w-48" />
          <div className="skeleton h-64 w-full" />
        </div>
        <div className="flex flex-col gap-3">
          <div className="skeleton h-6 w-48" />
          <div className="skeleton h-48 w-full" />
        </div>
      </div>
    </div>
  );
}

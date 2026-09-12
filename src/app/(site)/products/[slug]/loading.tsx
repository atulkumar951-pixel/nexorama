export default function ProductDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 animate-pulse">
      {/* Breadcrumbs */}
      <div className="mb-6 flex items-center gap-2">
        <div className="h-4 w-20 rounded bg-slate-200"></div>
        <div className="h-4 w-4 rounded bg-slate-200"></div>
        <div className="h-4 w-28 rounded bg-slate-200"></div>
        <div className="h-4 w-4 rounded bg-slate-200"></div>
        <div className="h-4 w-48 rounded bg-slate-200"></div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Left column */}
        <div>
          {/* Main Cover */}
          <div className="aspect-[16/10] w-full rounded-2xl bg-slate-200"></div>

          {/* About section */}
          <div className="card mt-6 p-6 space-y-3">
            <div className="h-6 w-40 rounded bg-slate-200"></div>
            <div className="h-4 w-full rounded bg-slate-200"></div>
            <div className="h-4 w-5/6 rounded bg-slate-200"></div>
            <div className="h-4 w-4/6 rounded bg-slate-200"></div>
          </div>

          {/* Included materials */}
          <div className="card mt-6 p-6 space-y-3">
            <div className="h-6 w-48 rounded bg-slate-200"></div>
            <div className="h-12 w-full rounded-lg bg-slate-100"></div>
            <div className="h-12 w-full rounded-lg bg-slate-100"></div>
          </div>
        </div>

        {/* Right buy box */}
        <div>
          <div className="card p-6 space-y-5">
            <div className="h-5 w-24 rounded-full bg-slate-200"></div>
            <div className="h-8 w-3/4 rounded bg-slate-200"></div>
            <div className="h-10 w-36 rounded bg-slate-200"></div>
            <div className="h-12 w-full rounded-xl bg-indigo-200"></div>
            <div className="h-11 w-full rounded-xl bg-slate-100"></div>
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <div className="h-4 w-full rounded bg-slate-200"></div>
              <div className="h-4 w-5/6 rounded bg-slate-200"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

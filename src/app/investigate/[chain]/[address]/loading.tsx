export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Running assessment">
      <div className="skeleton h-24 rounded-lg" />
      <div className="skeleton h-40 rounded-lg" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div key={index} className="skeleton h-20 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="skeleton h-96 rounded-lg" />
        <div className="skeleton h-96 rounded-lg" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading address report">
      <div className="skeleton h-24 rounded-lg" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="skeleton h-20 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="skeleton h-64 rounded-lg" />
        ))}
      </div>
      <div className="skeleton h-80 rounded-lg" />
    </div>
  );
}

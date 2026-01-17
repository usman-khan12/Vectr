export default function MapPanel(props) {
  const { title, children } = props || {};

  return (
    <div className="flex h-64 flex-col rounded-lg border border-gray-700 bg-gray-800/40">
      {title && (
        <div className="border-b border-gray-700 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          {title}
        </div>
      )}
      <div className="flex flex-1 items-center justify-center px-3 py-2 text-sm text-gray-500">
        {children}
      </div>
    </div>
  );
}

const TYPE_STYLES = {
  hazard: {
    icon: "⚠️",
    className: "bg-red-900/40 border-l-4 border-red-500",
  },
  access: {
    icon: "🚪",
    className: "bg-blue-900/40 border-l-4 border-blue-500",
  },
  parking: {
    icon: "🅿️",
    className: "bg-green-900/40 border-l-4 border-green-500",
  },
  animal: {
    icon: "🐕",
    className: "bg-yellow-900/40 border-l-4 border-yellow-500",
  },
  general: {
    icon: "📝",
    className: "bg-gray-800 border-l-4 border-gray-500",
  },
};

export default function NoteCard(props) {
  const { type, content } = props || {};
  const style = TYPE_STYLES[type] || TYPE_STYLES.general;

  return (
    <div
      className={
        "min-w-[200px] rounded-lg p-3 text-sm text-gray-100 flex items-start gap-2 " +
        style.className
      }
    >
      <span className="mt-0.5 text-lg">{style.icon}</span>
      <p className="leading-snug">{content}</p>
    </div>
  );
}

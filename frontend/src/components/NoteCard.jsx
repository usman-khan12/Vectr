const TYPE_STYLES = {
  hazard: {
    icon: "warning",
    iconClassName: "text-ems-red",
    className: "bg-ems-red/10 border-l-4 border-ems-red",
  },
  access: {
    icon: "door_open",
    iconClassName: "text-ems-blue-light",
    className: "bg-ems-blue/10 border-l-4 border-ems-blue-light",
  },
  parking: {
    icon: "local_parking",
    iconClassName: "text-ems-blue",
    className: "bg-ems-blue/10 border-l-4 border-ems-blue",
  },
  animal: {
    icon: "pets",
    iconClassName: "text-ems-blue-light",
    className: "bg-slate-900 border-l-4 border-ems-blue-light",
  },
  general: {
    icon: "description",
    iconClassName: "text-ems-gray",
    className: "bg-slate-900 border-l-4 border-ems-gray",
  },
};

export default function NoteCard(props) {
  const { type, content } = props || {};
  const style = TYPE_STYLES[type] || TYPE_STYLES.general;

  return (
    <div
      className={
        "min-w-[200px] rounded-lg p-3 text-sm text-ems-white flex items-start gap-2 " +
        style.className
      }
    >
      <span className="mt-0.5 flex items-center justify-center">
        <span
          className={
            "material-symbols-outlined text-[18px] leading-none " +
            style.iconClassName
          }
        >
          {style.icon}
        </span>
      </span>
      <p className="leading-snug text-ems-gray">{content}</p>
    </div>
  );
}

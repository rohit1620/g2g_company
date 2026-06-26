export default function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between px-8 pt-8 pb-6">
      <div>
        <h1 className="text-[22px] font-medium" style={{ color: "var(--foreground)" }}>
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-[14px]" style={{ color: "var(--muted)" }}>
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

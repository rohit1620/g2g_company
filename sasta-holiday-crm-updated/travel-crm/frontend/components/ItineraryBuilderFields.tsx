"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

// A titled card used to group a section of the builder (Day wise, Hotel, Sightseeing, etc.)
export function BuilderSection({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border p-5 mb-6"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-[15px] font-medium" style={{ color: "var(--foreground)" }}>
            {title}
          </h3>
          {description && (
            <p className="text-[12px] mt-0.5" style={{ color: "var(--muted)" }}>
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// A small bordered card for a single repeatable item (one day, one hotel, ...)
// with a collapsible body and a remove button.
export function ItemCard({
  badge,
  title,
  onRemove,
  children,
  defaultOpen = true,
}: {
  badge?: React.ReactNode;
  title: React.ReactNode;
  onRemove?: () => void;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className="rounded-lg border mb-3"
      style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2.5 text-left flex-1 min-w-0"
        >
          {badge}
          <span className="text-[13px] font-medium truncate" style={{ color: "var(--foreground)" }}>
            {title}
          </span>
          <ChevronDown
            size={14}
            style={{
              color: "var(--muted)",
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 0.15s",
            }}
          />
        </button>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[12px] font-medium shrink-0 ml-3"
            style={{ color: "#9B3A37" }}
          >
            Remove
          </button>
        )}
      </div>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

// A labelled toggle switch, used for the "If you want" optional sections
// (Inclusions, Exclusions, Payment policy, ...).
export function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer py-1.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 cursor-pointer accent-[var(--accent)]"
      />
      <span className="text-[13px]" style={{ color: "var(--foreground)" }}>
        {label}
      </span>
    </label>
  );
}

export function SmallLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[12px] mb-1" style={{ color: "var(--muted)" }}>
      {children}
    </label>
  );
}

const smallInputClass =
  "w-full rounded-lg border px-3 py-2 text-[13px] outline-none transition-colors focus:border-[var(--primary-light)]";
const smallInputStyle = { backgroundColor: "var(--surface)", borderColor: "var(--border)" };

export function SmallInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={smallInputClass} style={smallInputStyle} />;
}

export function SmallTextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={smallInputClass} style={smallInputStyle} />;
}

export function SmallSelect({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={smallInputClass + " cursor-pointer"} style={smallInputStyle}>
      {children}
    </select>
  );
}

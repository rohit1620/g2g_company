export function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[13px] font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
      {children}
      {required && <span style={{ color: "var(--accent)" }}> *</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border px-3 py-2.5 text-[14px] outline-none transition-colors focus:border-[var(--primary-light)]";
const inputStyle = { backgroundColor: "var(--surface)", borderColor: "var(--border)" };

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputClass} style={inputStyle} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={inputClass} style={inputStyle} />;
}

export function Select({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={inputClass + " cursor-pointer"} style={inputStyle}>
      {children}
    </select>
  );
}

export function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

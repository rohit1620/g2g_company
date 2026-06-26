import { LeadStatus } from "@/lib/types";

const styles: Record<LeadStatus, { bg: string; text: string; dot: string }> = {
  "Not Assigned": { bg: "#EAEDF3", text: "#4B5670", dot: "#8A93A6" },
  Assigned: { bg: "#E3EFFC", text: "#0F3D6E", dot: "#2E7BD6" },
  "In Process": { bg: "#FBEEDA", text: "#7A4E0E", dot: "#E69A1F" },
  "Follow-up": { bg: "#ECE9FB", text: "#3D348E", dot: "#7C6FE0" },
  Confirmed: { bg: "#E0F4EC", text: "#0E5A3F", dot: "#1A9E72" },
  Cancelled: { bg: "#ECEEF2", text: "#4B5670", dot: "#8A93A6" },
  Lost: { bg: "#FBEAE9", text: "#9B3A37", dot: "#D9534F" },
};

export default function StatusBadge({ status }: { status: LeadStatus }) {
  const s = styles[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
      {status}
    </span>
  );
}

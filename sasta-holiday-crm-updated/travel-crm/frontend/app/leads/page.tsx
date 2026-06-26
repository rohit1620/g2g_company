"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Plus, Filter } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { statusOptions } from "@/lib/options";
import { LeadListItem, LeadStatus } from "@/lib/types";

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "All">("All");

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "All") params.set("status", statusFilter);
      const query = params.toString() ? `?${params.toString()}` : "";
      const data = await api.get<LeadListItem[]>(`/leads${query}`);
      setLeads(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(loadLeads, 300); // debounce search typing
    return () => clearTimeout(timer);
  }, [loadLeads]);

  return (
    <div>
      <PageHeader
        title="Leads"
        description={loading ? "Loading..." : `${leads.length} lead${leads.length === 1 ? "" : "s"}`}
        action={
          <Link
            href="/leads/new"
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-[14px] font-medium text-white"
            style={{ backgroundColor: "var(--accent)" }}
          >
            <Plus size={16} />
            Add lead
          </Link>
        }
      />

      <div className="px-8 flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--muted)" }}
          />
          <input
            type="text"
            placeholder="Search by name, destination, or ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border pl-9 pr-3 py-2.5 text-[14px] outline-none focus:border-[var(--primary-light)]"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "All")}
            className="appearance-none rounded-lg border pl-9 pr-8 py-2.5 text-[14px] outline-none cursor-pointer"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          >
            <option value="All">All statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Filter
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--muted)" }}
          />
        </div>
      </div>

      {error && (
        <div className="px-8 mb-4">
          <p className="text-[13px] rounded-lg px-3 py-2.5" style={{ backgroundColor: "#FBEAE9", color: "#9B3A37" }}>
            {error}
          </p>
        </div>
      )}

      <div className="px-8">
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          <table className="w-full text-left">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <Th>Customer</Th>
                <Th>Destination</Th>
                <Th>Travel date</Th>
                <Th>Source</Th>
                <Th>Vendor</Th>
                <Th>Assigned to</Th>
                <Th>Phase</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="cursor-pointer hover:bg-[var(--background)] transition-colors"
                  style={{ borderBottom: "1px solid var(--border)" }}
                  onClick={() => (window.location.href = `/leads/${lead.id}`)}
                >
                  <Td>
                    <div>
                      <p className="font-medium" style={{ color: "var(--foreground)" }}>
                        {lead.customer_name}
                      </p>
                      <p className="text-[12px]" style={{ color: "var(--muted)" }}>
                        {lead.lead_number}
                      </p>
                    </div>
                  </Td>
                  <Td>{lead.destination ?? "—"}</Td>
                  <Td>{formatDate(lead.travel_date)}</Td>
                  <Td>
                    {lead.lead_source
                      ? lead.lead_source === "Other"
                        ? lead.lead_source_other
                        : lead.lead_source
                      : "—"}
                  </Td>
                  <Td>{lead.vendor_name ?? lead.vendor_other ?? "—"}</Td>
                  <Td>{lead.assigned_to_name ?? "Unassigned"}</Td>
                  <Td>
                    <span
                      className="text-[12px] font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "var(--background)", color: "var(--muted)" }}
                    >
                      Phase {lead.current_phase}
                    </span>
                  </Td>
                  <Td>
                    <StatusBadge status={lead.status} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && leads.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-[14px]" style={{ color: "var(--muted)" }}>
                No leads match your search.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="px-4 py-3 text-[12px] font-medium"
      style={{ color: "var(--muted)" }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-3.5 text-[13px]" style={{ color: "var(--foreground)" }}>
      {children}
    </td>
  );
}

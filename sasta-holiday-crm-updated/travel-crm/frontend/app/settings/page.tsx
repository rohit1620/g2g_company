"use client";

import { useState, useEffect } from "react";
import { Plus, UserCog, Building2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { api } from "@/lib/api";
import { Employee, Vendor } from "@/lib/types";

export default function SettingsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newEmployee, setNewEmployee] = useState("");
  const [newVendor, setNewVendor] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [emps, vends] = await Promise.all([
        api.get<Employee[]>("/employees"),
        api.get<Vendor[]>("/vendors"),
      ]);
      setEmployees(emps);
      setVendors(vends);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }

  async function addEmployee() {
    if (!newEmployee.trim()) return;
    try {
      const created = await api.post<Employee>("/employees", { name: newEmployee.trim() });
      setEmployees((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewEmployee("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add employee.");
    }
  }

  async function addVendor() {
    if (!newVendor.trim()) return;
    try {
      const created = await api.post<Vendor>("/vendors", { name: newVendor.trim() });
      setVendors((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewVendor("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add vendor.");
    }
  }

  async function toggleEmployee(id: string, currentlyActive: boolean) {
    try {
      const updated = await api.patch<Employee>(`/employees/${id}`, { is_active: !currentlyActive });
      setEmployees((prev) => prev.map((e) => (e.id === id ? updated : e)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update employee.");
    }
  }

  async function toggleVendor(id: string, currentlyActive: boolean) {
    try {
      const updated = await api.patch<Vendor>(`/vendors/${id}`, { is_active: !currentlyActive });
      setVendors((prev) => prev.map((v) => (v.id === id ? updated : v)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update vendor.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage the employee and vendor lists used across leads"
      />

      {error && (
        <div className="px-8 mb-4">
          <p className="text-[13px] rounded-lg px-3 py-2.5" style={{ backgroundColor: "#FBEAE9", color: "#9B3A37" }}>
            {error}
          </p>
        </div>
      )}

      {loading ? (
        <p className="px-8 text-[13px]" style={{ color: "var(--muted)" }}>
          Loading...
        </p>
      ) : (
        <div className="px-8 pb-12 grid grid-cols-2 gap-6">
          <SettingsList
            icon={<UserCog size={16} />}
            title="Employees"
            subtitle="Shown in the assigned-to and activity dropdowns"
            items={employees}
            inputValue={newEmployee}
            onInputChange={setNewEmployee}
            onAdd={addEmployee}
            onToggle={toggleEmployee}
            placeholder="e.g. Neha Kulkarni"
          />

          <SettingsList
            icon={<Building2 size={16} />}
            title="Vendors"
            subtitle="Shown in the vendor dropdown on each lead"
            items={vendors}
            inputValue={newVendor}
            onInputChange={setNewVendor}
            onAdd={addVendor}
            onToggle={toggleVendor}
            placeholder="e.g. Coastal Travel Co."
          />
        </div>
      )}
    </div>
  );
}

function SettingsList({
  icon,
  title,
  subtitle,
  items,
  inputValue,
  onInputChange,
  onAdd,
  onToggle,
  placeholder,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  items: (Employee | Vendor)[];
  inputValue: string;
  onInputChange: (v: string) => void;
  onAdd: () => void;
  onToggle: (id: string, currentlyActive: boolean) => void;
  placeholder: string;
}) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-2 mb-1" style={{ color: "var(--foreground)" }}>
        {icon}
        <h3 className="text-[14px] font-medium">{title}</h3>
      </div>
      <p className="text-[12px] mb-4" style={{ color: "var(--muted)" }}>
        {subtitle}
      </p>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onAdd()}
          placeholder={placeholder}
          className="flex-1 rounded-lg border px-3 py-2 text-[13px] outline-none focus:border-[var(--primary-light)]"
          style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
        />
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium text-white shrink-0"
          style={{ backgroundColor: "var(--accent)" }}
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between px-3 py-2 rounded-lg"
            style={{ backgroundColor: "var(--background)" }}
          >
            <span
              className="text-[13px]"
              style={{ color: item.is_active ? "var(--foreground)" : "var(--muted)" }}
            >
              {item.name}
            </span>
            <button
              onClick={() => onToggle(item.id, item.is_active)}
              className="text-[12px] font-medium"
              style={{ color: item.is_active ? "var(--muted)" : "#1A9E72" }}
            >
              {item.is_active ? "Deactivate" : "Activate"}
            </button>
          </div>
        ))}

        {items.length === 0 && (
          <p className="text-[13px] py-3 text-center" style={{ color: "var(--muted)" }}>
            None added yet.
          </p>
        )}
      </div>
    </div>
  );
}

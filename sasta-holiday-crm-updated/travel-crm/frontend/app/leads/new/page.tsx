"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { FieldLabel, TextInput, TextArea, Select } from "@/components/FormFields";
import { leadSourceOptions, regardingOptions } from "@/lib/options";
import { api } from "@/lib/api";
import { Employee, Vendor } from "@/lib/types";

export default function NewLeadPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);

  // Step 1
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Step 2
  const [destination, setDestination] = useState("");
  const [regarding, setRegarding] = useState<string>("Package");
  const [regardingOther, setRegardingOther] = useState("");
  const [hotelPreference, setHotelPreference] = useState("");
  const [leadSource, setLeadSource] = useState<string>("");
  const [leadSourceOther, setLeadSourceOther] = useState("");
  const [createdBy, setCreatedBy] = useState<string>("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [assignedToManuallyChanged, setAssignedToManuallyChanged] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get<Employee[]>("/employees"), api.get<Vendor[]>("/vendors")])
      .then(([emps, vends]) => {
        setEmployees(emps);
        setVendors(vends);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load form options."))
      .finally(() => setLoadingLists(false));
  }, []);

  // "Assigned to" defaults to whoever is selected as "Created by",
  // unless the user has manually changed it themselves.
  useEffect(() => {
    if (!assignedToManuallyChanged && createdBy) {
      const matchingEmployee = employees.find((e) => e.name === createdBy);
      if (matchingEmployee) {
        setAssignedTo(matchingEmployee.id);
      }
    }
  }, [createdBy, assignedToManuallyChanged, employees]);
  function handleStep1Next(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName.trim() || !phone.trim() || !email.trim()) {
      setError("Name, phone, and email are all required before continuing.");
      return;
    }
    setError("");
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!createdBy) {
      alert("Please select who is creating this lead.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.post("/leads", {
        customer_name: customerName,
        phone,
        email,
        destination: destination || null,
        hotel_preference: regarding === "Flight" ? null : hotelPreference || null,
        lead_source: leadSource || null,
        lead_source_other: leadSource === "Other" ? leadSourceOther : null,
        regarding: regarding || "Package",
        regarding_other: regarding === "Other" ? regardingOther : null,
        assigned_to: assignedTo || null,
        created_by: createdBy,
      });
      router.push("/leads");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save lead.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="px-8 pt-8">
        <button
          onClick={() => (step === 2 ? setStep(1) : router.back())}
          className="flex items-center gap-1.5 text-[13px] mb-4"
          style={{ color: "var(--muted)" }}
        >
          <ArrowLeft size={14} />
          {step === 2 ? "Back to customer details" : "Back to leads"}
        </button>
      </div>

      <PageHeader
        title="Add lead"
        description={step === 1 ? "Step 1 of 2 — Customer details" : "Step 2 of 2 — Trip & assignment"}
      />

      <div className="px-8 mb-6 flex items-center gap-2">
        <StepDot active={step === 1} done={step === 2} label="1" />
        <div className="h-px w-10" style={{ backgroundColor: "var(--border)" }} />
        <StepDot active={step === 2} done={false} label="2" />
      </div>

      {error && (
        <div className="px-8 mb-2">
          <p className="text-[13px] rounded-lg px-3 py-2.5" style={{ backgroundColor: "#FBEAE9", color: "#9B3A37" }}>
            {error}
          </p>
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleStep1Next} className="px-8 pb-12 max-w-2xl">
          <Section title="Customer details">
            <Row>
              <FieldLabel required>Customer name</FieldLabel>
              <TextInput
                placeholder="e.g. Vikram Joshi"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </Row>
            <Row>
              <FieldLabel required>Phone number</FieldLabel>
              <TextInput
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </Row>
            <Row>
              <FieldLabel required>Email</FieldLabel>
              <TextInput
                type="email"
                placeholder="name@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Row>
          </Section>

          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-[14px] font-medium text-white mt-4"
            style={{ backgroundColor: "var(--accent)" }}
          >
            Next
            <ArrowRight size={15} />
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="px-8 pb-12 max-w-2xl">
          <Section title="Trip details">
            <Row>
              <FieldLabel>Destination</FieldLabel>
              <TextInput
                placeholder="e.g. Goa, Bali, Manali"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </Row>

            <Row>
              <FieldLabel>Regarding</FieldLabel>
              <Select value={regarding} onChange={(e) => setRegarding(e.target.value)}>
                {regardingOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </Row>

            {regarding === "Other" && (
              <Row>
                <FieldLabel required>Specify regarding</FieldLabel>
                <TextInput
                  placeholder="e.g. Visa + hotel only"
                  value={regardingOther}
                  onChange={(e) => setRegardingOther(e.target.value)}
                  required
                />
              </Row>
            )}

            {regarding !== "Flight" && (
              <Row>
                <FieldLabel>Hotel preference</FieldLabel>
                <TextInput
                  placeholder="e.g. 4-star, beachfront"
                  value={hotelPreference}
                  onChange={(e) => setHotelPreference(e.target.value)}
                />
              </Row>
            )}

            <Row>
              <FieldLabel>Lead source</FieldLabel>
              <Select value={leadSource} onChange={(e) => setLeadSource(e.target.value)}>
                <option value="">Not specified</option>
                {leadSourceOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Row>

            {leadSource === "Other" && (
              <Row>
                <FieldLabel required>Specify source</FieldLabel>
                <TextInput
                  placeholder="e.g. Referral by existing customer"
                  value={leadSourceOther}
                  onChange={(e) => setLeadSourceOther(e.target.value)}
                  required
                />
              </Row>
            )}
          </Section>

          <Section title="Created by & assignment" last>
            <Row>
              <FieldLabel required>Lead created by</FieldLabel>
              <Select value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} required disabled={loadingLists}>
                <option value="" disabled>
                  Select your name
                </option>
                {employees.filter((e) => e.is_active).map((e) => (
                  <option key={e.id} value={e.name}>
                    {e.name}
                  </option>
                ))}
              </Select>
            </Row>

            <Row>
              <FieldLabel>Assigned to</FieldLabel>
              <Select
                value={assignedTo}
                onChange={(e) => {
                  setAssignedTo(e.target.value);
                  setAssignedToManuallyChanged(true);
                }}
                disabled={loadingLists}
              >
                <option value="">Not assigned yet</option>
                {employees.filter((e) => e.is_active).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </Select>
              <p className="text-[12px] mt-1.5" style={{ color: "var(--muted)" }}>
                Defaults to whoever created the lead — change it if a different agent will handle it.
              </p>
            </Row>
          </Section>

          <div className="flex items-center gap-3 mt-8">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg px-5 py-2.5 text-[14px] font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: "var(--accent)" }}
            >
              {submitting ? "Saving..." : "Save lead"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/leads")}
              className="rounded-lg px-5 py-2.5 text-[14px] font-medium border"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div
      className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-medium"
      style={{
        backgroundColor: active || done ? "var(--accent)" : "var(--border)",
        color: active || done ? "#fff" : "var(--muted)",
      }}
    >
      {label}
    </div>
  );
}

function Section({
  title,
  children,
  last,
}: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className="py-6"
      style={!last ? { borderBottom: "1px solid var(--border)" } : undefined}
    >
      <h3 className="text-[14px] font-medium mb-4" style={{ color: "var(--foreground)" }}>
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

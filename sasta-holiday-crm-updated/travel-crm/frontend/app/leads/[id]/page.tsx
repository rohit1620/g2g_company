"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Hotel,
  Building2,
  Receipt,
  Pencil,
  Map,
  Plus,
  Trash2,
  Lock,
  ArrowRightCircle,
  ArrowLeftCircle,
  Check,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { api, getToken, API_BASE_URL } from "@/lib/api";
import { statusOptions, regardingOptions, paymentMethodOptions } from "@/lib/options";
import {
  LeadDetail,
  Employee,
  Vendor,
  LeadStatus,
  ItineraryListItem,
  PaymentInstallment,
} from "@/lib/types";

function formatDate(d: string | null) {
  if (!d) return "Not set";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatINR(n: number | string) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

const PHASE_STEPS = [
  { number: 1, label: "Phase 1", sublabel: "Lead Generation" },
  { number: 2, label: "Phase 2", sublabel: "Vendor & Itinerary" },
  { number: 3, label: "Phase 3", sublabel: "Coming soon" },
];

type ActivityItem = {
  id: string;
  type: "created" | "status" | "assignment" | "note" | "trip" | "phase" | "phase3";
  text: string;
  by: string;
  at: string;
};

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [itineraries, setItineraries] = useState<ItineraryListItem[]>([]);
  const [installments, setInstallments] = useState<PaymentInstallment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [noteText, setNoteText] = useState("");
  const [noteAuthor, setNoteAuthor] = useState("");

  // Single edit mode — covers status, assignment, and trip details together
  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState<LeadStatus | "">("");
  const [editAssignedTo, setEditAssignedTo] = useState<string>("");
  const [editDestination, setEditDestination] = useState("");
  const [editTravelDate, setEditTravelDate] = useState("");
  const [editHotelPreference, setEditHotelPreference] = useState("");
  const [editRegarding, setEditRegarding] = useState<string>("Package");
  const [editRegardingOther, setEditRegardingOther] = useState("");
  const [editVendorId, setEditVendorId] = useState<string>("");
  const [editVendorOther, setEditVendorOther] = useState("");
const [editLeadSource, setEditLeadSource] = useState<string>("");
  const [editLeadSourceOther, setEditLeadSourceOther] = useState("");
  const [editMarginAmount, setEditMarginAmount] = useState("");
  const [editReviewRating, setEditReviewRating] = useState<number>(0);
  const [editReviewComment, setEditReviewComment] = useState("");
  const [editCloseStatus, setEditCloseStatus] = useState<string>("Not Closed");
  const [saveNote, setSaveNote] = useState("");
  const [saveActor, setSaveActor] = useState("");
  const [saving, setSaving] = useState(false);

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showPhaseForm, setShowPhaseForm] = useState(false);
  const [phaseActor, setPhaseActor] = useState("");
  const [phaseNote, setPhaseNote] = useState("");

  const loadLead = useCallback(async () => {
    try {
      const data = await api.get<LeadDetail>(`/leads/${leadId}`);
      setLead(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lead.");
    }
  }, [leadId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadLead(),
      api.get<Employee[]>("/employees").then(setEmployees),
      api.get<Vendor[]>("/vendors").then(setVendors),
      api.get<ItineraryListItem[]>(`/leads/${leadId}/itineraries`).then(setItineraries),
      api
        .get<PaymentInstallment[]>(`/leads/${leadId}/booking/installments`)
        .then(setInstallments)
        .catch(() => setInstallments([])),
    ])
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load page."))
      .finally(() => setLoading(false));
  }, [loadLead, leadId]);

  if (loading) {
    return (
      <div className="px-8 py-12">
        <p style={{ color: "var(--muted)" }}>Loading...</p>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="px-8 py-12">
        <p style={{ color: "var(--muted)" }}>{error || "Lead not found."}</p>
        <button onClick={() => router.push("/leads")} className="mt-2 text-[13px]" style={{ color: "var(--accent)" }}>
          Back to leads
        </button>
      </div>
    );
  }

  const isPhase1 = lead.current_phase === 1;
  const canMoveForward = lead.current_phase < 3;
  const canMoveBack = lead.current_phase > 1;

  const activity: ActivityItem[] = [
    {
      id: "created",
      type: "created" as const,
      text: "Lead created",
      by: lead.created_by,
      at: lead.created_at,
    },
    ...lead.statusHistory
      .filter((h) => h.old_status !== null)
      .map((h) => ({
        id: h.id,
        type: "status" as const,
        text: `Status changed from ${h.old_status} to ${h.new_status} — "${h.note}"`,
        by: h.changed_by,
        at: h.changed_at,
      })),
    ...lead.assignmentHistory.map((a) => ({
      id: a.id,
      type: "assignment" as const,
      text:
        (a.old_assigned_to_name
          ? `Reassigned from ${a.old_assigned_to_name} to ${a.new_assigned_to_name}`
          : `Assigned to ${a.new_assigned_to_name}`) + ` — "${a.note}"`,
      by: a.changed_by,
      at: a.changed_at,
    })),
    ...lead.tripDetailHistory.map((t) => ({
      id: t.id,
      type: "trip" as const,
      text: `Trip details edited — "${t.note}"`,
      by: t.changed_by,
      at: t.changed_at,
    })),
   ...lead.phaseHistory.map((p) => ({
      id: p.id,
      type: "phase" as const,
      text: `Moved from Phase ${p.old_phase} to Phase ${p.new_phase} — "${p.note}"`,
      by: p.changed_by,
      at: p.changed_at,
    })),
    ...lead.phase3History.map((p) => ({
      id: p.id,
      type: "phase3" as const,
      text: `Margin/review/closing updated — "${p.note}"`,
      by: p.changed_by,
      at: p.changed_at,
    })),
    ...lead.notes.map((n) => ({
      id: n.id,
      type: "note" as const,
      text: n.note_text,
      by: n.added_by,
      at: n.added_at,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  function startEditing() {
    setEditStatus(lead!.status);
    setEditAssignedTo(lead!.assigned_to ?? "");
    setEditDestination(lead!.destination ?? "");
    setEditTravelDate(lead!.travel_date ?? "");
    setEditHotelPreference(lead!.hotel_preference ?? "");
    setEditRegarding(lead!.regarding ?? "Package");
    setEditRegardingOther(lead!.regarding_other ?? "");
    setEditVendorId(lead!.vendor_id ?? "");
    setEditVendorOther(lead!.vendor_other ?? "");
    setEditLeadSource(lead!.lead_source ?? "");
    setEditLeadSourceOther(lead!.lead_source_other ?? "");
    setEditMarginAmount(lead!.margin_amount ?? "");
    setEditReviewRating(lead!.review_rating ?? 0);
    setEditReviewComment(lead!.review_comment ?? "");
    setEditCloseStatus(lead!.close_status ?? "Not Closed");
    setSaveNote("");
    setSaveActor("");
    setIsEditing(true);
  }
  function cancelEditing() {
    setIsEditing(false);
  }

  async function handleSaveChanges() {
    if (!saveActor) {
      alert("Select your name before saving.");
      return;
    }
    if (!saveNote.trim()) {
      alert("Add a note explaining what changed before saving.");
      return;
    }

   const statusChanged = editStatus && editStatus !== lead!.status;
    const assignmentChanged = editAssignedTo && editAssignedTo !== (lead!.assigned_to ?? "");
    const tripChanged =
      isPhase1 &&
      (editDestination !== (lead!.destination ?? "") ||
        editTravelDate !== (lead!.travel_date ?? "") ||
        editHotelPreference !== (lead!.hotel_preference ?? "") ||
        editRegarding !== (lead!.regarding ?? "Package") ||
        editRegardingOther !== (lead!.regarding_other ?? "") ||
        editVendorId !== (lead!.vendor_id ?? "") ||
        editVendorOther !== (lead!.vendor_other ?? "") ||
        editLeadSource !== (lead!.lead_source ?? "") ||
        editLeadSourceOther !== (lead!.lead_source_other ?? ""));
    const phase3Changed =
      lead!.current_phase === 3 &&
      (editMarginAmount !== (lead!.margin_amount ?? "") ||
        editReviewRating !== (lead!.review_rating ?? 0) ||
        editReviewComment !== (lead!.review_comment ?? "") ||
        editCloseStatus !== (lead!.close_status ?? "Not Closed"));

    if (!statusChanged && !assignmentChanged && !tripChanged && !phase3Changed) {
      alert("No changes were made.");
      return;
    }
    setSaving(true);
    try {
      if (statusChanged) {
        await api.patch(`/leads/${leadId}/status`, {
          new_status: editStatus,
          note: saveNote,
          changed_by: saveActor,
        });
      }
      if (assignmentChanged) {
        await api.patch(`/leads/${leadId}/assign`, {
          new_assigned_to: editAssignedTo,
          note: saveNote,
          changed_by: saveActor,
        });
      }
   if (tripChanged) {
        await api.patch(`/leads/${leadId}/trip-details`, {
          destination: editDestination || null,
          travel_date: editTravelDate || null,
          hotel_preference: editRegarding === "Flight" ? null : editHotelPreference || null,
          regarding: editRegarding || "Package",
          regarding_other: editRegarding === "Other" ? editRegardingOther : null,
          vendor_id: editVendorId && editVendorId !== "other" ? editVendorId : null,
          vendor_other: editVendorId === "other" ? editVendorOther : null,
          lead_source: editLeadSource || null,
          lead_source_other: editLeadSource === "Other" ? editLeadSourceOther : null,
          note: saveNote,
          changed_by: saveActor,
        });
      }
      if (phase3Changed) {
        await api.patch(`/leads/${leadId}/phase3-details`, {
          margin_amount: editMarginAmount || null,
          review_rating: editReviewRating || null,
          review_comment: editReviewComment || null,
          close_status: editCloseStatus,
          note: saveNote,
          changed_by: saveActor,
        });
      }
      setIsEditing(false);
      await loadLead();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim() || !noteAuthor) {
      alert("Add a note and select your name before saving.");
      return;
    }
    try {
      await api.post(`/leads/${leadId}/notes`, { note_text: noteText, added_by: noteAuthor });
      setNoteText("");
      await loadLead();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save note.");
    }
  }

  async function handlePhaseMove(newPhase: number) {
    if (!phaseActor || !phaseNote.trim()) {
      alert("Select your name and write a note before moving phases.");
      return;
    }
    try {
      await api.patch(`/leads/${leadId}/phase`, {
        new_phase: newPhase,
        note: phaseNote,
        changed_by: phaseActor,
      });
      setShowPhaseForm(false);
      setPhaseActor("");
      setPhaseNote("");
      await loadLead();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to move phase.");
    }
  }

  async function handleDeleteItinerary(itineraryId: string) {
    if (!confirm("Delete this itinerary draft? This can't be undone.")) return;
    try {
      await api.delete(`/leads/${leadId}/itineraries/${itineraryId}`);
      setItineraries((prev) => prev.filter((i) => i.id !== itineraryId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete itinerary.");
    }
  }

  async function handleAddInstallment(amount: string, paidOn: string, method: string, recordedBy: string) {
    if (!amount || !recordedBy) {
      alert("Enter an amount and select your name before saving.");
      return;
    }
    try {
      await api.post(`/leads/${leadId}/booking/installments`, {
        amount: Number(amount),
        paid_on: paidOn || undefined,
        payment_method: method || null,
        recorded_by: recordedBy,
      });
      setShowPaymentForm(false);
      await loadLead();
      const updated = await api.get<PaymentInstallment[]>(`/leads/${leadId}/booking/installments`);
      setInstallments(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to record payment.");
    }
  }

  async function handleDownloadInvoice() {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/leads/${leadId}/booking/invoice`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to download invoice.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${lead?.booking?.invoice_number || "invoice"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to download invoice.");
    }
  }

  return (
    <div className="px-8 py-8 max-w-5xl">
      <button
        onClick={() => router.push("/leads")}
        className="flex items-center gap-1.5 text-[13px] mb-6"
        style={{ color: "var(--muted)" }}
      >
        <ArrowLeft size={14} />
        Back to leads
      </button>

      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-medium">{lead.customer_name}</h1>
            <StatusBadge status={lead.status} />
          </div>
          <p className="text-[13px] mt-1" style={{ color: "var(--muted)" }}>
            {lead.lead_number} · Created by {lead.created_by} on {formatDate(lead.created_at)}
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={startEditing}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-[14px] font-medium text-white"
            style={{ backgroundColor: "var(--accent)" }}
          >
            <Pencil size={15} />
            Edit
          </button>
        )}
      </div>

{/* Phase stepper */}
      <div
        className="rounded-xl border p-5 mb-6"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center max-w-md mx-auto mb-4">
          {PHASE_STEPS.map((step, i) => {
            const isDone = step.number < lead.current_phase;
            const isCurrent = step.number === lead.current_phase;
            return (
              <div key={step.number} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[14px] font-medium shrink-0"
                    style={{
                      backgroundColor: isDone
                        ? "#E0F4EC"
                        : isCurrent
                        ? "var(--primary)"
                        : "var(--background)",
                      color: isDone ? "#0E5A3F" : isCurrent ? "#fff" : "var(--muted)",
                      border: !isDone && !isCurrent ? "1px solid var(--border)" : "none",
                    }}
                  >
                    {isDone ? <Check size={18} /> : step.number}
                  </div>
                  <span
                    className="text-[12px] font-medium mt-2 text-center whitespace-nowrap"
                    style={{ color: isCurrent || isDone ? "var(--foreground)" : "var(--muted)" }}
                  >
                    {step.label}
                  </span>
                  <span className="text-[11px] text-center" style={{ color: "var(--muted)" }}>
                    {step.sublabel}
                  </span>
                </div>
                {i < PHASE_STEPS.length - 1 && (
                  <div
                    className="flex-1 h-[2px] mb-7 mx-1"
                    style={{ backgroundColor: isDone ? "#9FE1CB" : "var(--border)" }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {!showPhaseForm && (
          <div className="flex items-center justify-center gap-2">
            {canMoveBack && (
              <button
                onClick={() => setShowPhaseForm(true)}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium border"
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                <ArrowLeftCircle size={15} />
                Back to Phase {lead.current_phase - 1}
              </button>
            )}
            {canMoveForward && (
              <button
                onClick={() => setShowPhaseForm(true)}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium border"
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                <ArrowRightCircle size={15} />
                Move to Phase {lead.current_phase + 1}
              </button>
            )}
          </div>
        )}
      </div>
      {showPhaseForm && (
        <div
          className="rounded-xl border p-4 mb-6"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          <p className="text-[13px] font-medium mb-3">Where do you want to move this lead?</p>
          <textarea
            value={phaseNote}
            onChange={(e) => setPhaseNote(e.target.value)}
            rows={2}
            placeholder="Note explaining this move (required)"
            className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none mb-2"
            style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
          />
          <div className="flex gap-2">
            <select
              value={phaseActor}
              onChange={(e) => setPhaseActor(e.target.value)}
              className="flex-1 rounded-lg border px-3 py-2 text-[13px] outline-none cursor-pointer"
              style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
            >
              <option value="">Your name</option>
              {employees.filter((e) => e.is_active).map((e) => (
                <option key={e.id} value={e.name}>
                  {e.name}
                </option>
              ))}
            </select>
            {canMoveBack && (
              <button
                onClick={() => handlePhaseMove(lead.current_phase - 1)}
                className="rounded-lg px-4 py-2 text-[13px] font-medium border shrink-0"
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                ← Phase {lead.current_phase - 1}
              </button>
            )}
            {canMoveForward && (
              <button
                onClick={() => handlePhaseMove(lead.current_phase + 1)}
                className="rounded-lg px-4 py-2 text-[13px] font-medium text-white shrink-0"
                style={{ backgroundColor: "var(--accent)" }}
              >
                Phase {lead.current_phase + 1} →
              </button>
            )}
            <button
              onClick={() => setShowPhaseForm(false)}
              className="rounded-lg px-4 py-2 text-[13px] font-medium border shrink-0"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card title="Contact">
            <InfoRow icon={<Phone size={15} />} label="Phone" value={lead.phone} />
            <InfoRow icon={<Mail size={15} />} label="Email" value={lead.email} />
          </Card>

          <Card title="Status & assignment">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] mb-1" style={{ color: "var(--muted)" }}>
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as LeadStatus)}
                    className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none cursor-pointer"
                    style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] mb-1" style={{ color: "var(--muted)" }}>
                    Assigned to
                  </label>
                  <select
                    value={editAssignedTo}
                    onChange={(e) => setEditAssignedTo(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none cursor-pointer"
                    style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
                  >
                    <option value="">Not assigned</option>
                    {employees.filter((e) => e.is_active).map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <>
                <InfoRow icon={<Building2 size={15} />} label="Status" value={lead.status} />
                <InfoRow
                  icon={<Building2 size={15} />}
                  label="Assigned to"
                  value={lead.assigned_to_name ?? "Unassigned"}
                />
              </>
            )}
          </Card>

          <Card
            title="Trip details"
            action={
              !isEditing &&
              !isPhase1 && (
                <span
                  className="flex items-center gap-1.5 text-[12px]"
                  style={{ color: "var(--muted)" }}
                  title="Move this lead back to Phase 1 to edit trip details"
                >
                  <Lock size={13} />
                  Locked in Phase {lead.current_phase}
                </span>
              )
            }
          >
            {isEditing ? (
              isPhase1 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] mb-1" style={{ color: "var(--muted)" }}>
                        Destination
                      </label>
                      <input
                        value={editDestination}
                        onChange={(e) => setEditDestination(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none"
                        style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] mb-1" style={{ color: "var(--muted)" }}>
                        Travel date
                      </label>
                      <input
                        type="date"
                        value={editTravelDate}
                        onChange={(e) => setEditTravelDate(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none"
                        style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] mb-1" style={{ color: "var(--muted)" }}>
                        Lead source
                      </label>
                      <select
                        value={editLeadSource}
                        onChange={(e) => setEditLeadSource(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none cursor-pointer"
                        style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
                      >
                        <option value="">Not specified</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Facebook">Facebook</option>
                        <option value="Google Ads">Google Ads</option>
                        <option value="Website">Website</option>
                        <option value="Direct">Direct</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] mb-1" style={{ color: "var(--muted)" }}>
                        Regarding
                      </label>
                      <select
                        value={editRegarding}
                        onChange={(e) => setEditRegarding(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none cursor-pointer"
                        style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
                      >
                        {regardingOptions.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {editLeadSource === "Other" && (
                    <div>
                      <label className="block text-[12px] mb-1" style={{ color: "var(--muted)" }}>
                        Specify source
                      </label>
                      <input
                        value={editLeadSourceOther}
                        onChange={(e) => setEditLeadSourceOther(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none"
                        style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
                      />
                    </div>
                  )}

                  {editRegarding === "Other" && (
                    <div>
                      <label className="block text-[12px] mb-1" style={{ color: "var(--muted)" }}>
                        Specify regarding
                      </label>
                      <input
                        value={editRegardingOther}
                        onChange={(e) => setEditRegardingOther(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none"
                        style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
                      />
                    </div>
                  )}

                  {editRegarding !== "Flight" && (
                    <div>
                      <label className="block text-[12px] mb-1" style={{ color: "var(--muted)" }}>
                        Hotel preference
                      </label>
                      <input
                        value={editHotelPreference}
                        onChange={(e) => setEditHotelPreference(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none"
                        style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[12px] mb-1" style={{ color: "var(--muted)" }}>
                      Vendor
                    </label>
                    <select
                      value={editVendorId}
                      onChange={(e) => setEditVendorId(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none cursor-pointer"
                      style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
                    >
                      <option value="">Not specified</option>
                      {vendors.filter((v) => v.is_active).map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {editVendorId === "other" && (
                    <div>
                      <label className="block text-[12px] mb-1" style={{ color: "var(--muted)" }}>
                        Specify vendor
                      </label>
                      <input
                        value={editVendorOther}
                        onChange={(e) => setEditVendorOther(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none"
                        style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <p
                  className="flex items-center gap-1.5 text-[13px]"
                  style={{ color: "var(--muted)" }}
                >
                  <Lock size={14} />
                  Trip details are locked while this lead is in Phase {lead.current_phase}. Move it back
                  to Phase 1 to edit them.
                </p>
              )
            ) : (
              <>
                <InfoRow icon={<MapPin size={15} />} label="Destination" value={lead.destination ?? "Not set"} />
                <InfoRow icon={<Calendar size={15} />} label="Travel date" value={formatDate(lead.travel_date)} />
                {lead.regarding !== "Flight" && (
                  <InfoRow icon={<Hotel size={15} />} label="Hotel preference" value={lead.hotel_preference ?? "Not set"} />
                )}
                <InfoRow
                  icon={<Building2 size={15} />}
                  label="Regarding"
                  value={
                    lead.regarding
                      ? lead.regarding === "Other"
                        ? lead.regarding_other ?? "Other"
                        : lead.regarding
                      : "Not set"
                  }
                />
                <InfoRow
                  icon={<Building2 size={15} />}
                  label="Vendor"
                  value={lead.vendor_name ?? lead.vendor_other ?? "Not set"}
                />
                <InfoRow
                  icon={<MapPin size={15} />}
                  label="Lead source"
                  value={
                    lead.lead_source
                      ? lead.lead_source === "Other"
                        ? lead.lead_source_other ?? "Other"
                        : lead.lead_source
                      : "Not set"
                  }
                />
              </>
            )}
          </Card>
<Card title="Margin, review & closing">
            {lead.current_phase < 3 ? (
              <p
                className="flex items-center gap-1.5 text-[13px]"
                style={{ color: "var(--muted)" }}
              >
                <Lock size={14} />
                Move this lead to Phase 3 to record margin, client review, and closing status.
              </p>
            ) : isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] mb-1" style={{ color: "var(--muted)" }}>
                    Margin amount (₹)
                  </label>
                  <input
                    type="number"
                    value={editMarginAmount}
                    onChange={(e) => setEditMarginAmount(e.target.value)}
                    placeholder="e.g. 8000"
                    className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none"
                    style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
                  />
                </div>

                <div>
                  <label className="block text-[12px] mb-1" style={{ color: "var(--muted)" }}>
                    Client review rating
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setEditReviewRating(star)}
                        className="text-[22px] leading-none"
                        style={{ color: star <= editReviewRating ? "#E69A1F" : "var(--border)" }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] mb-1" style={{ color: "var(--muted)" }}>
                    Client review comment
                  </label>
                  <textarea
                    value={editReviewComment}
                    onChange={(e) => setEditReviewComment(e.target.value)}
                    rows={2}
                    placeholder="What did the client say?"
                    className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none"
                    style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
                  />
                </div>

                <div>
                  <label className="block text-[12px] mb-1" style={{ color: "var(--muted)" }}>
                    Close status
                  </label>
                  <select
                    value={editCloseStatus}
                    onChange={(e) => setEditCloseStatus(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none cursor-pointer"
                    style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
                  >
                    <option value="Not Closed">Not Closed</option>
                    <option value="Closed - Won">Closed - Won</option>
                    <option value="Closed - Lost">Closed - Lost</option>
                  </select>
                </div>
              </div>
            ) : (
              <>
                <InfoRow
                  icon={<Receipt size={15} />}
                  label="Margin"
                  value={lead.margin_amount ? formatINR(lead.margin_amount) : "Not set"}
                />
                <InfoRow
                  icon={<Building2 size={15} />}
                  label="Client review"
                  value={lead.review_rating ? "★".repeat(lead.review_rating) + "☆".repeat(5 - lead.review_rating) : "Not set"}
                />
                {lead.review_comment && (
                  <InfoRow icon={<Building2 size={15} />} label="Review comment" value={lead.review_comment} />
                )}
                <InfoRow icon={<Building2 size={15} />} label="Close status" value={lead.close_status} />
              </>
            )}
          </Card>
          {isEditing && (
            <div
              className="rounded-xl border p-5"
              style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
            >
              <h3 className="text-[14px] font-medium mb-4">Save changes</h3>
              <label className="block text-[12px] mb-1" style={{ color: "var(--muted)" }}>
                Note explaining what changed (required)
              </label>
              <textarea
                value={saveNote}
                onChange={(e) => setSaveNote(e.target.value)}
                rows={3}
                placeholder="e.g. Customer confirmed travel dates, moving to In Process"
                className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none mb-3"
                style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
              />
              <label className="block text-[12px] mb-1" style={{ color: "var(--muted)" }}>
                Your name
              </label>
              <select
                value={saveActor}
                onChange={(e) => setSaveActor(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none cursor-pointer mb-4"
                style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
              >
                <option value="">Select your name</option>
                {employees.filter((e) => e.is_active).map((e) => (
                  <option key={e.id} value={e.name}>
                    {e.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="rounded-lg px-5 py-2.5 text-[14px] font-medium text-white disabled:opacity-60"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <button
                  onClick={cancelEditing}
                  className="rounded-lg px-5 py-2.5 text-[14px] font-medium border"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <Card
            title="Itineraries"
            action={
              lead.current_phase >= 2 && (
                <Link
                  href={`/leads/${leadId}/itineraries/new`}
                  className="flex items-center gap-1.5 text-[12px] font-medium"
                  style={{ color: "var(--accent)" }}
                >
                  <Plus size={13} />
                  New itinerary
                </Link>
              )
            }
          >
            {lead.current_phase < 2 ? (
              <p
                className="flex items-center gap-1.5 text-[13px]"
                style={{ color: "var(--muted)" }}
              >
                <Lock size={14} />
                Move this lead to Phase 2 to add itineraries.
              </p>
            ) : itineraries.length === 0 ? (
              <p className="text-[13px]" style={{ color: "var(--muted)" }}>
                No itineraries yet. Create one to plan a day-by-day trip for this customer.
              </p>
            ) : (
              <div className="space-y-1">
                {itineraries.map((itinerary) => (
                  <div
                    key={itinerary.id}
                    className="flex items-center justify-between px-3 py-2.5 -mx-3 rounded-lg hover:bg-[var(--background)] transition-colors"
                  >
                    <Link
                      href={`/leads/${leadId}/itineraries/${itinerary.id}`}
                      className="flex items-center gap-3 min-w-0 flex-1"
                    >
                      <Map size={15} style={{ color: "var(--muted)" }} />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium truncate">{itinerary.title}</p>
                        <p className="text-[12px]" style={{ color: "var(--muted)" }}>
                          By {itinerary.created_by} · {formatDate(itinerary.created_at)}
                        </p>
                      </div>
                    </Link>
                    <button
                      onClick={() => handleDeleteItinerary(itinerary.id)}
                      className="shrink-0 ml-3"
                      style={{ color: "var(--muted)" }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Add a note">
            <form onSubmit={handleAddNote} className="space-y-3">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
                placeholder="Add an update, customer response, or anything worth recording..."
                className="w-full rounded-lg border px-3 py-2.5 text-[13px] outline-none focus:border-[var(--primary-light)]"
                style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
              />
              <div className="flex items-center gap-2">
                <select
                  value={noteAuthor}
                  onChange={(e) => setNoteAuthor(e.target.value)}
                  className="rounded-lg border px-3 py-2 text-[13px] outline-none cursor-pointer flex-1"
                  style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
                >
                  <option value="">Select your name</option>
                  {employees.filter((e) => e.is_active).map((e) => (
                    <option key={e.id} value={e.name}>
                      {e.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-lg px-4 py-2 text-[13px] font-medium text-white shrink-0"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  Save note
                </button>
              </div>
            </form>
          </Card>

          <Card title="Activity log">
            <div className="space-y-4">
              {activity.map((item, i) => (
                <div key={`${item.type}-${item.id}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className="h-2 w-2 rounded-full mt-1.5"
                      style={{ backgroundColor: dotColor(item.type) }}
                    />
                    {i < activity.length - 1 && (
                      <div className="w-px flex-1 mt-1" style={{ backgroundColor: "var(--border)" }} />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="text-[13px]">{item.text}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: "var(--muted)" }}>
                      {item.by} · {formatDateTime(item.at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="col-span-1">
          {lead.booking ? (
            <Card title="Booking & payment">
              <div className="flex items-center gap-2 mb-4 text-[12px]" style={{ color: "var(--muted)" }}>
                <Receipt size={14} />
                {lead.booking.invoice_number}
              </div>
              <div className="space-y-3">
                <AmountRow label="Total amount" value={formatINR(lead.booking.total_amount)} />
                <AmountRow label="Advance paid" value={formatINR(lead.booking.advance_paid)} positive />
                <div style={{ borderTop: "1px solid var(--border)" }} className="pt-3">
                  <AmountRow
                    label="Balance due"
                    value={formatINR(lead.booking.balance_due)}
                    bold
                    danger={Number(lead.booking.balance_due) > 0}
                  />
                </div>
              </div>

              <button
                onClick={handleDownloadInvoice}
                className="w-full mt-5 rounded-lg px-4 py-2.5 text-[13px] font-medium border"
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                Download invoice
              </button>

              <div className="mt-5 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[12px] font-medium" style={{ color: "var(--muted)" }}>
                    Payment history
                  </p>
                  {!showPaymentForm && (
                    <button
                      onClick={() => setShowPaymentForm(true)}
                      className="text-[12px] font-medium"
                      style={{ color: "var(--accent)" }}
                    >
                      + Add payment
                    </button>
                  )}
                </div>

                {showPaymentForm && (
                  <PaymentForm
                    employees={employees}
                    onCancel={() => setShowPaymentForm(false)}
                    onSave={handleAddInstallment}
                  />
                )}

                <div className="space-y-2 mt-3">
                  {installments.length === 0 && !showPaymentForm && (
                    <p className="text-[12px]" style={{ color: "var(--muted)" }}>
                      No payments recorded yet.
                    </p>
                  )}
                  {installments.map((inst) => (
                    <div key={inst.id} className="flex items-center justify-between text-[12px]">
                      <div>
                        <p style={{ color: "var(--foreground)" }}>
                          {formatINR(inst.amount)}{" "}
                          {inst.payment_method && (
                            <span style={{ color: "var(--muted)" }}>· {inst.payment_method}</span>
                          )}
                        </p>
                        <p style={{ color: "var(--muted)" }}>
                          {formatDate(inst.paid_on)} · {inst.recorded_by}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ) : (
            <Card title="Booking & payment">
              {lead.status === "Confirmed" ? (
                <BookingForm leadId={leadId} onCreated={loadLead} />
              ) : (
                <p className="text-[13px]" style={{ color: "var(--muted)" }}>
                  No booking yet. Mark this lead as <strong className="font-medium">Confirmed</strong> to add
                  payment details.
                </p>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function BookingForm({ leadId, onCreated }: { leadId: string; onCreated: () => void }) {
  const [totalAmount, setTotalAmount] = useState("");
  const [advancePaid, setAdvancePaid] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!totalAmount) {
      alert("Enter the total amount.");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/leads/${leadId}/booking`, {
        total_amount: Number(totalAmount),
        advance_paid: Number(advancePaid || 0),
      });
      onCreated();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create booking.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <div>
        <label className="block text-[12px] mb-1" style={{ color: "var(--muted)" }}>
          Total amount (₹)
        </label>
        <input
          type="number"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none"
          style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
        />
      </div>
      <div>
        <label className="block text-[12px] mb-1" style={{ color: "var(--muted)" }}>
          Advance paid (₹)
        </label>
        <input
          type="number"
          value={advancePaid}
          onChange={(e) => setAdvancePaid(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none"
          style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg px-4 py-2 text-[13px] font-medium text-white disabled:opacity-60"
        style={{ backgroundColor: "var(--accent)" }}
      >
        {saving ? "Saving..." : "Create booking"}
      </button>
    </form>
  );
}

function PaymentForm({
  employees,
  onCancel,
  onSave,
}: {
  employees: Employee[];
  onCancel: () => void;
  onSave: (amount: string, paidOn: string, method: string, recordedBy: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("");
  const [recordedBy, setRecordedBy] = useState("");

  return (
    <div className="space-y-2 mb-3 p-3 rounded-lg" style={{ backgroundColor: "var(--background)" }}>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          placeholder="Amount (₹)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-lg border px-3 py-2 text-[13px] outline-none"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        />
        <input
          type="date"
          value={paidOn}
          onChange={(e) => setPaidOn(e.target.value)}
          className="rounded-lg border px-3 py-2 text-[13px] outline-none"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        />
      </div>
      <select
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none cursor-pointer"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
      >
        <option value="">Payment method (optional)</option>
        {paymentMethodOptions.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <select
        value={recordedBy}
        onChange={(e) => setRecordedBy(e.target.value)}
        className="w-full rounded-lg border px-3 py-2 text-[13px] outline-none cursor-pointer"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
      >
        <option value="">Your name</option>
        {employees.filter((e) => e.is_active).map((e) => (
          <option key={e.id} value={e.name}>
            {e.name}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          onClick={() => onSave(amount, paidOn, method, recordedBy)}
          className="flex-1 rounded-lg px-3 py-2 text-[13px] font-medium text-white"
          style={{ backgroundColor: "var(--accent)" }}
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg px-3 py-2 text-[13px] font-medium border"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function dotColor(type: ActivityItem["type"]) {
  switch (type) {
    case "created":
      return "#8A93A6";
    case "status":
      return "#2E7BD6";
    case "assignment":
      return "#7C6FE0";
    case "trip":
      return "#E69A1F";
    case "phase":
      return "#0F3D6E";
    case "phase3":
      return "#D4537E";
    case "note":
      return "#1A9E72";
  }
}
function Card({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-medium">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2 text-[13px]" style={{ borderBottom: "1px solid var(--border)" }}>
      <span style={{ color: "var(--muted)" }}>{icon}</span>
      <span className="w-32 shrink-0" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      <span style={{ color: "var(--foreground)" }}>{value}</span>
    </div>
  );
}

function AmountRow({
  label,
  value,
  bold,
  positive,
  danger,
}: {
  label: string;
  value: string;
  bold?: boolean;
  positive?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span
        className={bold ? "font-medium text-[15px]" : ""}
        style={{
          color: danger ? "var(--accent)" : positive ? "#1A9E72" : "var(--foreground)",
        }}
      >
        {value}
      </span>
    </div>
  );
}
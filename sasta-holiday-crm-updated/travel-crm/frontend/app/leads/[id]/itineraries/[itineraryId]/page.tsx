"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Plus, Download, Hotel as HotelIcon, MapPin } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { FieldLabel, TextInput, TextArea, Select } from "@/components/FormFields";
import {
  BuilderSection,
  ItemCard,
  ToggleRow,
  SmallLabel,
  SmallInput,
  SmallTextArea,
  SmallSelect,
} from "@/components/ItineraryBuilderFields";
import { api, getToken, API_BASE_URL } from "@/lib/api";
import { mealTypeOptions, tourTypeOptions } from "@/lib/options";
import { ItineraryDetail, ItineraryDay, ItineraryHotel, ItinerarySightseeing, LeadDetail, TourType } from "@/lib/types";

function emptyDay(dayNumber: number): ItineraryDay {
  return { day_number: dayNumber, day_date: null, title: null, description: null };
}

function emptyHotel(): ItineraryHotel {
  return {
    hotel_name: "",
    star_rating: null,
    location: null,
    rooms: 1,
    guests: 1,
    room_type: null,
    meal_type: null,
    check_in: null,
    check_out: null,
  };
}

function emptySightseeing(): ItinerarySightseeing {
  return { title: "", tour_type: "PRIVATE" };
}

export default function ItineraryEditorPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;
  const itineraryId = params.itineraryId as string;
  const isNew = itineraryId === "new";

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [employees, setEmployees] = useState<{ id: string; name: string; is_active: boolean }[]>([]);

  // Overview
  const [title, setTitle] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [duration, setDuration] = useState("");
  const [highlights, setHighlights] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [totalRooms, setTotalRooms] = useState(1);

  // Day wise
  const [days, setDays] = useState<ItineraryDay[]>([emptyDay(1)]);

  // Hotels
  const [hotels, setHotels] = useState<ItineraryHotel[]>([]);

  // Sightseeing
  const [sightseeing, setSightseeing] = useState<ItinerarySightseeing[]>([]);

  // If you want — optional sections
  const [showInclusions, setShowInclusions] = useState(true);
  const [inclusionsText, setInclusionsText] = useState("");
  const [showExclusions, setShowExclusions] = useState(true);
  const [exclusionsText, setExclusionsText] = useState("");
  const [showPaymentPolicy, setShowPaymentPolicy] = useState(false);
  const [paymentPolicyText, setPaymentPolicyText] = useState("");
  const [showCancellationPolicy, setShowCancellationPolicy] = useState(false);
  const [cancellationPolicyText, setCancellationPolicyText] = useState("");
  const [showTerms, setShowTerms] = useState(false);
  const [termsText, setTermsText] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState("");

  // Tour cost
  const [tourCost, setTourCost] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadItinerary = useCallback(async () => {
    if (isNew) return;
    const data = await api.get<ItineraryDetail>(`/leads/${leadId}/itineraries/${itineraryId}`);
    setTitle(data.title);
    setCreatedBy(data.created_by);
    setDuration(data.duration ?? "");
    setHighlights(data.highlights ?? "");
    setDepartureDate(data.departure_date ? data.departure_date.slice(0, 10) : "");
    setArrivalDate(data.arrival_date ? data.arrival_date.slice(0, 10) : "");
    setAdults(data.adults ?? 1);
    setChildren(data.children ?? 0);
    setTotalRooms(data.total_rooms ?? 1);
    setDays(
      data.days.length
        ? data.days.map((d) => ({ ...d, day_date: d.day_date ? d.day_date.slice(0, 10) : null }))
        : [emptyDay(1)]
    );
    setHotels(
      data.hotels.map((h) => ({
        ...h,
        check_in: h.check_in ? h.check_in.slice(0, 10) : null,
        check_out: h.check_out ? h.check_out.slice(0, 10) : null,
      }))
    );
    setSightseeing(data.sightseeing);
    setShowInclusions(data.show_inclusions);
    setInclusionsText(data.inclusions_text ?? "");
    setShowExclusions(data.show_exclusions);
    setExclusionsText(data.exclusions_text ?? "");
    setShowPaymentPolicy(data.show_payment_policy);
    setPaymentPolicyText(data.payment_policy_text ?? "");
    setShowCancellationPolicy(data.show_cancellation_policy);
    setCancellationPolicyText(data.cancellation_policy_text ?? "");
    setShowTerms(data.show_terms);
    setTermsText(data.terms_text ?? "");
    setShowNote(data.show_note);
    setNoteText(data.note_text ?? "");
    setTourCost(data.tour_cost ?? "");
  }, [leadId, itineraryId, isNew]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<LeadDetail>(`/leads/${leadId}`).then(setLead),
      api.get<{ id: string; name: string; is_active: boolean }[]>("/employees").then(setEmployees),
      loadItinerary(),
    ])
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load itinerary."))
      .finally(() => setLoading(false));
  }, [leadId, loadItinerary]);

  // Day helpers
  function addDay() {
    setDays((prev) => [...prev, emptyDay(prev.length + 1)]);
  }
  function removeDay(index: number) {
    setDays((prev) => prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, day_number: i + 1 })));
  }
  function updateDay(index: number, patch: Partial<ItineraryDay>) {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  // Hotel helpers
  function addHotel() {
    setHotels((prev) => [...prev, emptyHotel()]);
  }
  function removeHotel(index: number) {
    setHotels((prev) => prev.filter((_, i) => i !== index));
  }
  function updateHotel(index: number, patch: Partial<ItineraryHotel>) {
    setHotels((prev) => prev.map((h, i) => (i === index ? { ...h, ...patch } : h)));
  }

  // Sightseeing helpers
  function addSightseeing() {
    setSightseeing((prev) => [...prev, emptySightseeing()]);
  }
  function removeSightseeing(index: number) {
    setSightseeing((prev) => prev.filter((_, i) => i !== index));
  }
  function updateSightseeing(index: number, patch: Partial<ItinerarySightseeing>) {
    setSightseeing((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  async function handleSave() {
    if (!title.trim()) {
      alert("Give this itinerary a title (e.g. 'Itinerary For Dubai').");
      return;
    }
    if (!createdBy) {
      alert("Select your name before saving.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        title,
        duration: duration || null,
        highlights: highlights || null,
        departure_date: departureDate || null,
        arrival_date: arrivalDate || null,
        adults,
        children,
        total_rooms: totalRooms,
        tour_cost: tourCost || null,
        show_inclusions: showInclusions,
        inclusions_text: inclusionsText || null,
        show_exclusions: showExclusions,
        exclusions_text: exclusionsText || null,
        show_payment_policy: showPaymentPolicy,
        payment_policy_text: paymentPolicyText || null,
        show_cancellation_policy: showCancellationPolicy,
        cancellation_policy_text: cancellationPolicyText || null,
        show_terms: showTerms,
        terms_text: termsText || null,
        show_note: showNote,
        note_text: noteText || null,
        days,
        hotels: hotels.filter((h) => h.hotel_name.trim()),
        sightseeing: sightseeing.filter((s) => s.title.trim()),
      };

      if (isNew) {
        const created = await api.post<ItineraryDetail>(`/leads/${leadId}/itineraries`, {
          title,
          created_by: createdBy,
        });
        await api.put(`/leads/${leadId}/itineraries/${created.id}`, payload);
        router.replace(`/leads/${leadId}/itineraries/${created.id}`);
      } else {
        await api.put(`/leads/${leadId}/itineraries/${itineraryId}`, payload);
        alert("Itinerary saved.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save itinerary.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadPdf() {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/leads/${leadId}/itineraries/${itineraryId}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to download PDF.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title || "itinerary"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to download PDF.");
    }
  }

  if (loading) {
    return (
      <div className="px-8 py-12">
        <p style={{ color: "var(--muted)" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="px-8 py-8 max-w-3xl">
      <button
        onClick={() => router.push(`/leads/${leadId}`)}
        className="flex items-center gap-1.5 text-[13px] mb-6"
        style={{ color: "var(--muted)" }}
      >
        <ArrowLeft size={14} />
        Back to lead
      </button>

      <PageHeader
        title={isNew ? "New itinerary" : "Edit itinerary"}
        description={lead ? `For ${lead.customer_name}` : undefined}
        action={
          !isNew && (
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-[14px] font-medium border"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              <Download size={16} />
              Download PDF
            </button>
          )
        }
      />

      {error && (
        <p className="text-[13px] rounded-lg px-3 py-2.5 mb-4" style={{ backgroundColor: "#FBEAE9", color: "#9B3A37" }}>
          {error}
        </p>
      )}

      {/* Overview */}
      <BuilderSection title="Trip overview" description="The headline details shown on the cover of the proposal.">
        <div className="space-y-4">
          <div>
            <FieldLabel required>Tour title</FieldLabel>
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Itinerary For Dubai"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Duration</FieldLabel>
              <TextInput
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 5 nights / 6 Days"
              />
            </div>
            <div>
              <FieldLabel required>Created by</FieldLabel>
              <Select value={createdBy} onChange={(e) => setCreatedBy(e.target.value)}>
                <option value="">Select your name</option>
                {employees
                  .filter((e) => e.is_active)
                  .map((e) => (
                    <option key={e.id} value={e.name}>
                      {e.name}
                    </option>
                  ))}
              </Select>
            </div>
          </div>

          <div>
            <FieldLabel>Highlights</FieldLabel>
            <TextArea
              value={highlights}
              onChange={(e) => setHighlights(e.target.value)}
              rows={2}
              placeholder="e.g. Explore Dubai & Abu Dhabi with Desert Safari, Burj Khalifa, Miracle Garden..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Departure date</FieldLabel>
              <TextInput type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
            </div>
            <div>
              <FieldLabel>Arrival date</FieldLabel>
              <TextInput type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <FieldLabel>Adults</FieldLabel>
              <TextInput
                type="number"
                min={0}
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <FieldLabel>Children</FieldLabel>
              <TextInput
                type="number"
                min={0}
                value={children}
                onChange={(e) => setChildren(Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <FieldLabel>Total rooms</FieldLabel>
              <TextInput
                type="number"
                min={0}
                value={totalRooms}
                onChange={(e) => setTotalRooms(Number(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>
      </BuilderSection>

      {/* Day wise details */}
      <BuilderSection title="Day wise details" description="One card per day of the trip.">
        {days.map((day, index) => (
          <ItemCard
            key={index}
            title={`Day ${day.day_number}${day.title ? ` — ${day.title}` : ""}`}
            onRemove={days.length > 1 ? () => removeDay(index) : undefined}
          >
            <div className="grid grid-cols-[100px_1fr] gap-3">
              <div>
                <SmallLabel>Day</SmallLabel>
                <SmallInput value={day.day_number} disabled />
              </div>
              <div>
                <SmallLabel>Title</SmallLabel>
                <SmallInput
                  value={day.title ?? ""}
                  onChange={(e) => updateDay(index, { title: e.target.value || null })}
                  placeholder="e.g. Friday, October 9th, 2026"
                />
              </div>
            </div>
            <div>
              <SmallLabel>Description</SmallLabel>
              <SmallTextArea
                value={day.description ?? ""}
                onChange={(e) => updateDay(index, { description: e.target.value || null })}
                rows={5}
                placeholder="e.g. Arrival | PRIVATE&#10;Pickup from: Dubai International Airport&#10;Drop at: Hotel..."
              />
            </div>
          </ItemCard>
        ))}
        <button
          onClick={addDay}
          className="w-full mt-1 flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-[13px] font-medium border"
          style={{ borderColor: "var(--border)", color: "var(--accent)" }}
        >
          <Plus size={15} />
          Add day
        </button>
      </BuilderSection>

      {/* Hotel details */}
      <BuilderSection title="Hotel details" description="Every hotel stay included in this trip.">
        {hotels.map((hotel, index) => (
          <ItemCard
            key={index}
            badge={<HotelIcon size={14} style={{ color: "var(--accent)" }} />}
            title={hotel.hotel_name || "New hotel"}
            onRemove={() => removeHotel(index)}
          >
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <div>
                <SmallLabel>Hotel name</SmallLabel>
                <SmallInput
                  value={hotel.hotel_name}
                  onChange={(e) => updateHotel(index, { hotel_name: e.target.value })}
                  placeholder="e.g. The Tower Plaza Hotel"
                />
              </div>
              <div>
                <SmallLabel>Star rating</SmallLabel>
                <SmallInput
                  type="number"
                  min={1}
                  max={7}
                  value={hotel.star_rating ?? ""}
                  onChange={(e) => updateHotel(index, { star_rating: Number(e.target.value) || null })}
                />
              </div>
            </div>
            <div>
              <SmallLabel>Hotel location</SmallLabel>
              <SmallInput
                value={hotel.location ?? ""}
                onChange={(e) => updateHotel(index, { location: e.target.value || null })}
                placeholder="e.g. Sheikh Zayed Road"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <SmallLabel>Rooms</SmallLabel>
                <SmallInput
                  type="number"
                  min={1}
                  value={hotel.rooms}
                  onChange={(e) => updateHotel(index, { rooms: Number(e.target.value) || 1 })}
                />
              </div>
              <div>
                <SmallLabel>Guests</SmallLabel>
                <SmallInput
                  type="number"
                  min={1}
                  value={hotel.guests}
                  onChange={(e) => updateHotel(index, { guests: Number(e.target.value) || 1 })}
                />
              </div>
              <div>
                <SmallLabel>Meal type</SmallLabel>
                <SmallSelect
                  value={hotel.meal_type ?? ""}
                  onChange={(e) => updateHotel(index, { meal_type: e.target.value || null })}
                >
                  <option value="">—</option>
                  {mealTypeOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </SmallSelect>
              </div>
            </div>
            <div>
              <SmallLabel>Room type</SmallLabel>
              <SmallInput
                value={hotel.room_type ?? ""}
                onChange={(e) => updateHotel(index, { room_type: e.target.value || null })}
                placeholder="e.g. Sky Superior Room"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <SmallLabel>Check-in</SmallLabel>
                <SmallInput
                  type="date"
                  value={hotel.check_in ?? ""}
                  onChange={(e) => updateHotel(index, { check_in: e.target.value || null })}
                />
              </div>
              <div>
                <SmallLabel>Check-out</SmallLabel>
                <SmallInput
                  type="date"
                  value={hotel.check_out ?? ""}
                  onChange={(e) => updateHotel(index, { check_out: e.target.value || null })}
                />
              </div>
            </div>
          </ItemCard>
        ))}
        <button
          onClick={addHotel}
          className="w-full mt-1 flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-[13px] font-medium border"
          style={{ borderColor: "var(--border)", color: "var(--accent)" }}
        >
          <Plus size={15} />
          Add hotel
        </button>
      </BuilderSection>

      {/* Sightseeing */}
      <BuilderSection title="Sightseeing" description="Tag each activity as Private, SIC, or Ticket only.">
        {sightseeing.map((item, index) => (
          <ItemCard
            key={index}
            badge={<MapPin size={14} style={{ color: "var(--accent)" }} />}
            title={item.title || "New sightseeing item"}
            onRemove={() => removeSightseeing(index)}
            defaultOpen={false}
          >
            <div>
              <SmallLabel>Title</SmallLabel>
              <SmallInput
                value={item.title}
                onChange={(e) => updateSightseeing(index, { title: e.target.value })}
                placeholder="e.g. Standard Desert Safari with BBQ dinner"
              />
            </div>
            <div>
              <SmallLabel>Tour type</SmallLabel>
              <div className="flex gap-4">
                {tourTypeOptions.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                    <input
                      type="radio"
                      name={`tour-type-${index}`}
                      checked={item.tour_type === opt.value}
                      onChange={() => updateSightseeing(index, { tour_type: opt.value as TourType })}
                      className="cursor-pointer"
                    />
                    <span style={{ color: "var(--foreground)" }}>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </ItemCard>
        ))}
        <button
          onClick={addSightseeing}
          className="w-full mt-1 flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-[13px] font-medium border"
          style={{ borderColor: "var(--border)", color: "var(--accent)" }}
        >
          <Plus size={15} />
          Add sightseeing
        </button>
      </BuilderSection>

      {/* If you want */}
      <BuilderSection title="If you want" description="Optional sections to include in the printed proposal.">
        <div className="space-y-1">
          <OptionalSection
            label="Inclusions section"
            checked={showInclusions}
            onToggle={setShowInclusions}
            value={inclusionsText}
            onChange={setInclusionsText}
            placeholder="One line per item, e.g.&#10;Hotel stays as listed&#10;Transfers (Private)&#10;Pick up from: Dubai International Airport"
          />
          <OptionalSection
            label="Exclusions section"
            checked={showExclusions}
            onToggle={setShowExclusions}
            value={exclusionsText}
            onChange={setExclusionsText}
            placeholder="One line per item, e.g.&#10;Airfare / Flight tickets&#10;Travel Insurance"
          />
          <OptionalSection
            label="Payment policy section"
            checked={showPaymentPolicy}
            onToggle={setShowPaymentPolicy}
            value={paymentPolicyText}
            onChange={setPaymentPolicyText}
            placeholder="e.g. 50% advance to confirm booking, balance 7 days before travel."
          />
          <OptionalSection
            label="Cancellation policy section"
            checked={showCancellationPolicy}
            onToggle={setShowCancellationPolicy}
            value={cancellationPolicyText}
            onChange={setCancellationPolicyText}
            placeholder="e.g. Free cancellation up to 15 days before travel..."
          />
          <OptionalSection
            label="Term & Condition"
            checked={showTerms}
            onToggle={setShowTerms}
            value={termsText}
            onChange={setTermsText}
            placeholder="Any general terms and conditions for this proposal."
          />
          <OptionalSection
            label="Note section"
            checked={showNote}
            onToggle={setShowNote}
            value={noteText}
            onChange={setNoteText}
            placeholder="e.g. Important Note: At The Top Burj Khalifa timings vary seasonally."
          />
        </div>
      </BuilderSection>

      {/* Tour cost */}
      <BuilderSection title="Add tour cost">
        <TextInput
          value={tourCost}
          onChange={(e) => setTourCost(e.target.value)}
          placeholder="e.g. Tour Cost - 2,20,000/- for All Members"
        />
      </BuilderSection>

      <div className="flex items-center gap-3 mt-2 mb-12">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg px-5 py-2.5 text-[14px] font-medium text-white disabled:opacity-60"
          style={{ backgroundColor: "var(--accent)" }}
        >
          {saving ? "Saving..." : isNew ? "Create itinerary" : "Save changes"}
        </button>
        <button
          onClick={() => router.push(`/leads/${leadId}`)}
          className="rounded-lg px-5 py-2.5 text-[14px] font-medium border"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function OptionalSection({
  label,
  checked,
  onToggle,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="py-1">
      <ToggleRow label={label} checked={checked} onChange={onToggle} />
      {checked && (
        <div className="pl-6 pb-2 pt-1">
          <SmallTextArea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            placeholder={placeholder}
          />
        </div>
      )}
    </div>
  );
}

export type LeadStatus =
  | "Not Assigned"
  | "Assigned"
  | "In Process"
  | "Follow-up"
  | "Confirmed"
  | "Cancelled"
  | "Lost";

export type LeadSource =
  | "Instagram"
  | "Facebook"
  | "Google Ads"
  | "Website"
  | "Direct"
  | "Other";

export type Regarding = "Package" | "Flight" | "Other";

export interface Employee {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Vendor {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface LeadNote {
  id: string;
  note_text: string;
  added_by: string;
  added_at: string;
}

export interface StatusHistoryEntry {
  id: string;
  old_status: LeadStatus | null;
  new_status: LeadStatus;
  note: string;
  changed_by: string;
  changed_at: string;
}

export interface AssignmentHistoryEntry {
  id: string;
  old_assigned_to: string | null;
  old_assigned_to_name: string | null;
  new_assigned_to: string;
  new_assigned_to_name: string;
  note: string;
  changed_by: string;
  changed_at: string;
}

export interface TripDetailHistoryEntry {
  id: string;
  note: string;
  changed_by: string;
  changed_at: string;
}

export interface PhaseHistoryEntry {
  id: string;
  old_phase: number;
  new_phase: number;
  note: string;
  changed_by: string;
  changed_at: string;
}

export interface Booking {
  id: string;
  lead_id: string;
  total_amount: string;
  advance_paid: string;
  balance_due: string;
  invoice_number: string;
  created_at: string;
}

export interface PaymentInstallment {
  id: string;
  booking_id: string;
  amount: string;
  paid_on: string;
  payment_method: string | null;
  recorded_by: string;
  created_at: string;
}

// Shape returned by GET /api/leads (list view)
export interface LeadListItem {
  id: string;
  lead_number: string;
  customer_name: string;
  phone: string;
  email: string;
  travel_date: string | null;
  destination: string | null;
  lead_source: LeadSource | null;
  lead_source_other: string | null;
  vendor_id: string | null;
  vendor_name: string | null;
  vendor_other: string | null;
  status: LeadStatus;
  current_phase: number;
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_by: string;
  created_at: string;
}
export interface Phase3HistoryEntry {
  id: string;
  note: string;
  changed_by: string;
  changed_at: string;
}

export type CloseStatus = "Not Closed" | "Closed - Won" | "Closed - Lost";

// Shape returned by GET /api/leads/:id (detail view)
export interface LeadDetail extends LeadListItem {
  hotel_preference: string | null;
  regarding: Regarding | null;
  regarding_other: string | null;
  margin_amount: string | null;
  review_rating: number | null;
  review_comment: string | null;
  close_status: CloseStatus;
  updated_at: string;
  notes: LeadNote[];
  statusHistory: StatusHistoryEntry[];
  assignmentHistory: AssignmentHistoryEntry[];
  tripDetailHistory: TripDetailHistoryEntry[];
  phaseHistory: PhaseHistoryEntry[];
  phase3History: Phase3HistoryEntry[];
  booking: Booking | null;
}

export interface DashboardStats {
  totalLeads: number;
  conversionRate: number;
  revenue: number;
  collected: number;
  statusCounts: Record<string, number>;
  recentLeads: {
    id: string;
    lead_number: string;
    customer_name: string;
    destination: string | null;
    travel_date: string | null;
    status: LeadStatus;
    assigned_to_name: string | null;
  }[];
}

export interface ItineraryDay {
  id?: string;
  day_number: number;
  day_date: string | null;
  title: string | null;
  description: string | null;
}

export type TourType = "PRIVATE" | "SIC" | "TICKET_ONLY";

export interface ItineraryHotel {
  id?: string;
  hotel_name: string;
  star_rating: number | null;
  location: string | null;
  rooms: number;
  guests: number;
  room_type: string | null;
  meal_type: string | null;
  check_in: string | null;
  check_out: string | null;
}

export interface ItinerarySightseeing {
  id?: string;
  title: string;
  tour_type: TourType;
}

export interface ItineraryListItem {
  id: string;
  lead_id: string;
  title: string;
  duration: string | null;
  departure_date: string | null;
  arrival_date: string | null;
  tour_cost: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ItineraryDetail extends ItineraryListItem {
  highlights: string | null;
  adults: number;
  children: number;
  total_rooms: number;
  show_inclusions: boolean;
  inclusions_text: string | null;
  show_exclusions: boolean;
  exclusions_text: string | null;
  show_payment_policy: boolean;
  payment_policy_text: string | null;
  show_cancellation_policy: boolean;
  cancellation_policy_text: string | null;
  show_terms: boolean;
  terms_text: string | null;
  show_note: boolean;
  note_text: string | null;
  cover_image_url: string | null;
  days: ItineraryDay[];
  hotels: ItineraryHotel[];
  sightseeing: ItinerarySightseeing[];
}

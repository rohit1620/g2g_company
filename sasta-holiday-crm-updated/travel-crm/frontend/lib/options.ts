export const leadSourceOptions = ["Instagram", "Facebook", "Google Ads", "Website", "Direct", "Other"] as const;
export const regardingOptions = ["Package", "Flight", "Other"] as const;
export const statusOptions = [
  "Not Assigned",
  "Assigned",
  "In Process",
  "Follow-up",
  "Confirmed",
  "Cancelled",
  "Lost",
] as const;
export const paymentMethodOptions = ["Cash", "UPI", "Bank Transfer", "Card", "Other"] as const;
export const tourTypeOptions = [
  { value: "PRIVATE", label: "PRIVATE" },
  { value: "SIC", label: "SIC" },
  { value: "TICKET_ONLY", label: "TICKET ONLY" },
] as const;
export const mealTypeOptions = ["CP", "MAP", "AP", "EP"] as const;

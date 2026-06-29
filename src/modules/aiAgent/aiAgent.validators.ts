import Fuse from "fuse.js";
import * as chrono from "chrono-node";

// ---------------------------------------------------------------------------
// Date Validation
// ---------------------------------------------------------------------------

export type DateValidationResult =
  | { valid: true; iso: string }
  | { valid: false; ambiguous: true; message: string }
  | { valid: false; ambiguous: false; message: string };

export function validateAppointmentDate(raw: string): DateValidationResult {
  if (!raw?.trim()) {
    return {
      valid: false,
      ambiguous: false,
      message: "No date provided. Please specify a date like 'July 5' or '2026-07-05'.",
    };
  }

  // chrono-node returns multiple results when the input is ambiguous (e.g. "2 or 3 days later")
  const results = chrono.parse(raw);

  if (results.length === 0) {
    return {
      valid: false,
      ambiguous: false,
      message: `I couldn't understand the date "${raw}". Please provide a specific date like "July 5" or "2026-07-05".`,
    };
  }

  if (results.length > 1) {
    // Multiple date expressions parsed — genuinely ambiguous input
    const options = results
      .map((r) => r.date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }))
      .join(" or ");
    return {
      valid: false,
      ambiguous: true,
      message: `Did you mean ${options}?`,
    };
  }

  const parsed = results[0].date();

  // Reject past dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);

  if (parsed < today) {
    return {
      valid: false,
      ambiguous: false,
      message: "The appointment date is in the past. Please choose a future date.",
    };
  }

  return {
    valid: true,
    iso: parsed.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Specialization Validation
// ---------------------------------------------------------------------------

export type SpecializationValidationResult =
  | { valid: true; value: string }
  | { valid: false; suggestion: string | null; message: string };

export function validateSpecialization(raw: string, knownList: string[]): SpecializationValidationResult {
  if (!raw?.trim()) {
    return { valid: false, suggestion: null, message: "No specialization provided." };
  }

  // Exact match first (case-insensitive)
  const exact = knownList.find((s) => s.toLowerCase() === raw.trim().toLowerCase());
  if (exact) return { valid: true, value: exact };

  // Fuzzy match via Fuse.js
  const fuse = new Fuse(knownList, {
    threshold: 0.4, // 0 = exact, 1 = match anything — 0.4 catches typical typos
    distance: 100,
    minMatchCharLength: 3,
  });

  const matches = fuse.search(raw.trim());

  if (matches.length > 0) {
    return {
      valid: false,
      suggestion: matches[0].item,
      message: `Did you mean "${matches[0].item}"?`,
    };
  }

  return {
    valid: false,
    suggestion: null,
    message: `"${raw}" is not a recognized specialization. Which specialist would you like to see?`,
  };
}

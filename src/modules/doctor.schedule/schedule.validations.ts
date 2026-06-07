import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────────

const WeekDay = z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]);

// ─── Schedule ─────────────────────────────────────────────────────────────────

export const createScheduleSchema = z.object({
  day: WeekDay,
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "startTime must be in HH:MM format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "endTime must be in HH:MM format"),
  slotDuration: z.number().int().min(5, "slotDuration must be at least 5 minutes"),
  maxPatients: z.number().int().min(1).optional().default(1),
  isActive: z.boolean().optional().default(true),
});

export const updateScheduleSchema = z
  .object({
    day: WeekDay.optional(),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "startTime must be in HH:MM format")
      .optional(),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "endTime must be in HH:MM format")
      .optional(),
    slotDuration: z.number().int().min(5).optional(),
    maxPatients: z.number().int().min(1).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required for update",
  });

export const scheduleParamSchema = z.object({
  params: z.object({ scheduleId: z.string() }),
});

// ─── Slot ─────────────────────────────────────────────────────────────────────

/**
 * Generate slots for a schedule on a specific date (or date range).
 * The service will use the schedule's startTime/endTime/slotDuration
 * to auto-create DoctorSlot rows.
 */
export const generateSlotsSchema = z.object({
  dates: z
    .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"))
    .min(1, "At least one date is required")
    .max(30, "Cannot generate slots for more than 30 dates at once"),
});

export const getSlotsByDoctorSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional(),
  available: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  page: z.number().min(1).default(1).optional(),
  limit: z.number().min(1).default(10).optional(),
});

export const cancelSlotSchema = z.object({ slotId: z.string() });

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
export type GenerateSlotsInput = z.infer<typeof generateSlotsSchema>;
export type GetSlotsByDoctorQuery = z.infer<typeof getSlotsByDoctorSchema>;

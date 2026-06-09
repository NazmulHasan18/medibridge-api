import { z } from "zod";

const medicineSchema = z.object({
  medicineName: z.string().min(1, "Medicine name is required"),
  dosage: z.string().min(1, "Dosage is required"), // e.g. "500mg", "1 tablet"
  frequency: z.string().min(1, "Frequency is required"), // e.g. "1+0+1", "TDS", "BD"
  duration: z.string().min(1, "Duration is required"), // e.g. "7 days", "2 weeks"
  instruction: z.string().optional(), // e.g. "After meal", "With water"
});

export const createPrescriptionSchema = z.object({
  appointmentId: z.number({ error: "appointmentId is required" }).int().positive(),
  patientId: z.number({ error: "patientId is required" }).int().positive(),
  diagnosis: z.string().optional(),
  advice: z.string().optional(),
  followUpDate: z.iso.datetime({ offset: true }).optional(),
  content: z.unknown().optional(),
  medicines: z.array(medicineSchema).min(1, "At least one medicine is required"),
});

export const updatePrescriptionSchema = z.object({
  diagnosis: z.string().optional(),
  advice: z.string().optional(),
  followUpDate: z.iso.datetime({ offset: true }).optional(),
  content: z.unknown().optional(),
  medicines: z.array(medicineSchema).optional(),
});

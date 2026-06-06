import { z } from "zod";
import { ConsultationType } from "@prisma/client";

export const createAppointmentSchema = z.object({
  doctorId: z.number({ error: "Doctor ID is required" }),
  slotId: z.number({ error: "Slot ID is required" }),
  patientName: z.string().min(1).max(100),
  relation: z.string().min(1).max(100),
  gender: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  consultationType: z.nativeEnum(ConsultationType),
  appointmentDate: z.string().datetime(),
  notes: z.string().optional(),
});

export const rescheduleAppointmentSchema = z.object({
  newSlotId: z.number({ error: "New slot ID is required" }),
  newAppointmentDate: z.string().datetime(),
});

export const updateAppointmentStatusSchema = z.object({
  appointmentStatus: z.enum(["PENDING", "BOOKED", "COMPLETED", "CANCELLED"]),
});

// export const paymentInitSchema = z.object({
//   publicId: z.string(),
// });

export const paymentValidationSchema = {
  createAppointment: createAppointmentSchema,
  rescheduleAppointment: rescheduleAppointmentSchema,
  updateAppointmentStatus: updateAppointmentStatusSchema,
  //   paymentInit: paymentInitSchema,
};

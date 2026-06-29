import { ConsultationType } from "@prisma/client";

export type createAppointmentPayload = {
  doctorId: number;
  slotId: number;
  patientId?: number;
  patientName: string;
  relation: string;
  gender?: string;
  dateOfBirth?: string;
  consultationType: ConsultationType;
  appointmentDate: string;
  notes?: string;
};

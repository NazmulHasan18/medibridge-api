// ─── Types ───────────────────────────────────────────────────────────────────

export interface MedicineInput {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instruction?: string;
}

export interface CreatePrescriptionInput {
  appointmentId: number;
  doctorId: number;
  patientId: number;
  diagnosis?: string;
  advice?: string;
  followUpDate?: string;
  content?: Record<string, unknown>; // rich text JSON (Tiptap doc)
  medicines: MedicineInput[];
}

export interface UpdatePrescriptionInput {
  diagnosis?: string;
  advice?: string;
  followUpDate?: string;
  content?: Record<string, unknown>;
  medicines?: MedicineInput[];
}

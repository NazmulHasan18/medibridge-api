export interface SearchDoctorInput {
  specialization: string;
  appointmentDate: string;
}

export interface GetSlotsInput {
  doctorId: string;
  date: string;
}

export interface BookAppointmentInput {
  patientId: string;
  doctorId: string;
  slot: string;
  reason: string;
}
export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ToolMap = {
  get_doctors: SearchDoctorInput;
  get_doctor_slots: GetSlotsInput;
  book_appointment: BookAppointmentInput;
};

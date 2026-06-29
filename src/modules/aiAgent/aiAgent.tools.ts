import { ChatCompletionTool } from "openai/resources";

export const agentFunctions: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_specializations",
      description:
        "Returns all available doctor specializations from the database. Call this before get_doctors when the user has not provided a specialization, or when the provided specialization may be misspelled or ambiguous.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_doctors",
      description:
        "Returns available doctors. if available true we have doctor for the date else we don't have.",
      parameters: {
        type: "object",
        properties: {
          specialization: {
            type: "string",
            description: "Doctor specialization.",
          },
          appointmentDate: {
            type: "string",
            description: "Date in YYYY-MM-DD format.",
          },
        },
        required: ["specialization", "appointmentDate"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_doctor_slots",
      description: "Returns available appointment slots for a specific doctor on a given date.",
      parameters: {
        type: "object",
        properties: {
          doctorId: { type: "string", description: "The publicId of the doctor." },
          date: {
            type: "string",
            description: "The date to check for slots in YYYY-MM-DD format.",
          },
        },
        required: ["doctorId", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "book_appointment",
      description: "Create a new appointment for a patient with a doctor.",
      parameters: {
        type: "object",
        properties: {
          doctorId: {
            type: "number",
            description: "The unique ID of the doctor.",
          },
          slotId: {
            type: "number",
            description: "The unique ID of the selected appointment slot.",
          },
          patientId: {
            type: "number",
            description:
              "The unique ID of the patient. Optional if creating an appointment for a new patient.",
          },
          patientName: {
            type: "string",
            description: "Full name of the patient.",
          },
          relation: {
            type: "string",
            description:
              "Relationship of the patient to the account holder (e.g., Self, Father, Mother, Spouse, Child).",
          },
          gender: {
            type: "string",
            description: "Patient's gender.",
            enum: ["Male", "Female", "Other"],
          },
          dateOfBirth: {
            type: "string",
            description: "Patient's date of birth in YYYY-MM-DD format.",
          },
          consultationType: {
            type: "string",
            description: "Type of consultation.",
            enum: ["ONLINE", "OFFLINE"],
          },
          appointmentDate: {
            type: "string",
            description: "Appointment date in YYYY-MM-DD format.",
          },
          notes: {
            type: "string",
            description: "Additional notes or reason for the appointment.",
          },
        },
        required: ["doctorId", "slotId", "patientName", "relation", "consultationType", "appointmentDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_patient_appointments",
      description: "Returns the current patient's appointment history, optionally filtered by status.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"],
            description: "Optional appointment status filter.",
          },
        },
        required: [],
      },
    },
  },
];

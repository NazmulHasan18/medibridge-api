import OpenAI from "openai";
import { agentFunctions } from "./aiAgent.tools.js";
import { DoctorService } from "../doctor/doctor.service.js";
import { appointmentService } from "../appointments/appointments.service.js";
import { DoctorScheduleService } from "../doctor.schedule/schedule.service.js";
import AppError from "../../errors/AppError.js";
import { ChatCompletionToolMessageParam } from "openai/resources";
import { ChatMessage } from "./aiAgent.types.js";
import { createAppointmentPayload } from "../appointments/appointments.types.js";
import { config } from "../../config/index.js";
import { validateAppointmentDate, validateSpecialization } from "./aiAgent.validators.js";

const client = new OpenAI({
  apiKey: config.groq_api_key,
  baseURL: "https://api.groq.com/openai/v1",
});

const SYSTEM_PROMPT = `
You are MediBot.

You help patients:

- Find doctor specializations.
- Find available doctors.
- Find available slots.
- Book appointments.

Rules:

- If you get available:true in find available doctors no matter it past or present just book.
- Use tools whenever information is needed.
- Never invent doctor names.
- Never invent specializations.
- If specialization is missing, call get_specializations.
- Resolve relative dates into YYYY-MM-DD before calling tools.
- Never book without explicit confirmation.
- Always use the tool calling API.
- Never output XML or JSON describing tool calls.
Booking Follow
step-1: 
- call get_specializations function and take specializations confirmation
step-2: 
- ask appointmentDate and check get_doctors function available or not?
- if doctor found take first doctor and check get_doctor_slots
step-3: 
- if slot available take first available slot from the step 2 get_doctor_slots and 
- using it's id book appointment for that date
`;

// ---------------------------------------------------------------------------
// Agent loop
// ---------------------------------------------------------------------------

export async function runAgentTurn(messages: ChatMessage[], patientId: number) {
  try {
    const systemMessage = { role: "system" as const, content: SYSTEM_PROMPT };

    const response = await client.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [systemMessage, ...messages],
      tools: agentFunctions,
      tool_choice: "auto",
    });

    let message = response.choices[0].message;

    // Agentic loop — keep resolving tool calls until the model returns a plain message
    while (message.tool_calls?.length) {
      const toolResults: ChatCompletionToolMessageParam[] = [];

      for (const call of message.tool_calls) {
        if (call.type !== "function") continue;

        let args: Record<string, any>;
        try {
          args = JSON.parse(call.function.arguments);
        } catch {
          toolResults.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({ success: false, message: "Malformed tool arguments." }),
          });
          continue;
        }

        const result = await executeTool(call.function.name, args, patientId);
        toolResults.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }

      const next = await client.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [systemMessage, ...messages, message, ...toolResults],
        tools: agentFunctions,
        tool_choice: "auto",
      });

      message = next.choices[0].message;
    }

    return message;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Tool executor — backend is the source of truth, Prisma never gets raw LLM output
// ---------------------------------------------------------------------------

async function executeTool(
  toolName: string,
  args: Record<string, any>,
  patientId: number,
): Promise<Record<string, any>> {
  try {
    console.log(args, toolName);
    switch (toolName) {
      // ------------------------------------------------------------------
      case "get_specializations": {
        const specializations = await DoctorService.getAllSpecialization();
        return { success: true, specializations };
      }

      // ------------------------------------------------------------------
      case "get_doctors": {
        // 1. Validate specialization
        const knownSpecs = await DoctorService.getAllSpecialization();
        const specResult = validateSpecialization(args.specialization ?? "", knownSpecs);

        if (!specResult.valid) {
          console.log("spec", specResult);
          return specResult.suggestion
            ? {
                success: false,
                needsClarification: true,
                message: specResult.message, // e.g. 'Did you mean "Endocrinology"?'
              }
            : {
                success: false,
                needsSpecialization: true,
                message: "Which specialist would you like to see?",
                options: knownSpecs,
              };
        }

        // 2. Validate date
        const dateResult = validateAppointmentDate(args.appointmentDate ?? "");
        if (!dateResult.valid) {
          console.log("date", dateResult);
          return {
            success: false,
            needsDate: !dateResult.ambiguous,
            needsClarification: dateResult.ambiguous,
            message: dateResult.message,
          };
        }

        // 3. Safe to query — both values are validated
        const doctors = await DoctorService.getAllAvailableDoctor({
          specialization: specResult.value,
          appointmentDate: dateResult.iso,
        });
        console.log({
          specialization: specResult.value,
          appointmentDate: dateResult.iso,
          doctors,
        });
        return { success: true, doctors };
      }

      // ------------------------------------------------------------------
      case "get_doctor_slots": {
        const dateResult = validateAppointmentDate(args.date ?? "");
        if (!dateResult.valid) {
          return { success: false, needsDate: true, message: dateResult.message };
        }

        const slots = await DoctorScheduleService.getSlotsByDoctor(args.doctorId, {
          date: dateResult.iso,
          limit: 100,
          available: true,
        });
        console.log(slots);
        return { success: true, slots: slots.data };
      }

      // ------------------------------------------------------------------
      case "book_appointment": {
        // The LLM must never be trusted to supply the patientId
        const dateResult = validateAppointmentDate(args.appointmentDate ?? "");
        if (!dateResult.valid) {
          return { success: false, needsDate: true, message: dateResult.message };
        }

        const result = await appointmentService.createAppointment(
          patientId, // always from the session, never from args
          { ...args, appointmentDate: dateResult.iso } as createAppointmentPayload,
        );
        return { success: true, appointment: result };
      }

      // ------------------------------------------------------------------
      case "get_patient_appointments": {
        const appointments = await appointmentService.getMyAppointments(patientId, "PATIENT", {
          status: args.status,
        });
        return { success: true, appointments };
      }

      // ------------------------------------------------------------------
      default:
        throw new AppError("Unknown Tool", 400);
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
}

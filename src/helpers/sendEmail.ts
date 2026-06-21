import { Resend } from "resend";
import * as fs from "fs";
import * as path from "path";
import { config } from "../config/index.js";
import { fileURLToPath } from "url";

const resend = new Resend(config.resendApiKey);

// ─── Template name → file mapping ────────────────────────────────────────────
type TemplateName =
  | "appointmentConfirmed"
  | "newAppointmentDoctor"
  | "appointmentPaymentFailed"
  | "appointmentRescheduled"
  | "appointmentRescheduledDoctor"
  | "appointmentReminder"
  | "appointmentCancelled";

// ─── Per-template data shapes ─────────────────────────────────────────────────
interface TemplateDataMap {
  appointmentConfirmed: {
    patientName: string;
    doctorName: string;
    appointmentDate: string;
    consultationType: string;
  };
  newAppointmentDoctor: {
    patientName: string;
    appointmentDate: string;
  };
  appointmentPaymentFailed: {
    patientName: string;
  };
  appointmentRescheduled: {
    patientName: string;
    newDate: string;
    doctorName: string;
  };
  appointmentRescheduledDoctor: {
    patientName: string;
    newDate: string;
  };
  appointmentCancelled: {
    patientName: string;
  };
  appointmentReminder: {
    patientName: string;
    doctorName: string;
    specialization: string;
    appointmentDate: string;
    appointmentTime: string;
    location: string;
    bookingId: string;
  };
}

// ─── sendEmail options ────────────────────────────────────────────────────────
interface SendEmailOptions<T extends TemplateName> {
  to: string | string[];
  subject: string;
  template: T;
  data: TemplateDataMap[T];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Load & interpolate HTML template ────────────────────────────────────────
function loadTemplate(templateName: TemplateName, data: Record<string, string>): string {
  const templatePath = path.resolve(__dirname, "templates", `${templateName}.html`);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Email template not found: ${templatePath}`);
  }

  let html = fs.readFileSync(templatePath, "utf-8");

  // Replace all {{key}} placeholders with actual values
  for (const [key, value] of Object.entries(data)) {
    html = html.replaceAll(`{{${key}}}`, value ?? "");
  }

  return html;
}

// ─── Main sendEmail function ──────────────────────────────────────────────────
export async function sendEmail<T extends TemplateName>(options: SendEmailOptions<T>): Promise<string> {
  const { to, subject, template, data } = options;

  const html = loadTemplate(template, data as Record<string, string>);

  const { data: resendData, error } = await resend.emails.send({
    // from: config.mailFrom ?? "onboarding@resend.dev",
    from: "onboarding@resend.dev",
    //  Array.isArray(to) ? to : [to]
    to: "nazmul182218@gmail.com",
    subject,
    html,
  });

  if (error) {
    throw new Error(`Failed to send email [${template}]: ${error.message}`);
  }

  return resendData!.id;
}

import { createJob } from "../base/createJob.js";
import { prisma } from "../../lib/prisma.js";
import { sendEmail } from "../../helpers/sendEmail.js";
import logger from "../../lib/logger.js";

export const appointmentReminderJob = createJob(
  {
    name: "AppointmentReminderJob",
    schedule: "0 0 * * *", // Every day at 8:00 AM
  },
  async () => {
    // Tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startOfDay = new Date(tomorrow);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(tomorrow);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentStatus: "CONFIRMED",
        doctorSlots: {
          startTime: {
            gte: startOfDay,
            lte: endOfDay,
          },
          isCancelled: false,
        },
      },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
        doctor: {
          include: {
            user: true,
          },
        },
        doctorSlots: {
          where: {
            startTime: {
              gte: startOfDay,
              lte: endOfDay,
            },
            isCancelled: false,
          },
        },
      },
    });

    logger.info(`Found ${appointments.length} appointment(s) for reminder emails.`);

    await Promise.all(
      appointments.map(async (appt) => {
        try {
          const slot = appt.doctorSlots;

          if (!slot) return;

          await sendEmail({
            to: appt.patient.user.email,
            subject: "Appointment Reminder",
            template: "appointmentReminder",
            data: {
              patientName: appt.patient.user.name,
              appointmentDate: slot.startTime.toLocaleDateString(),
              appointmentTime: slot.startTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              doctorName: appt.doctor.user.name,
              specialization: appt.doctor.specialization,
              bookingId: appt.publicId,
              location: "Hospital", // Replace with your actual location field
            },
          });

          logger.info(`Reminder email sent to ${appt.patient.user.email} (${appt.publicId})`);
        } catch (error) {
          logger.error({
            message: "Failed to send appointment reminder",
            appointmentId: appt.publicId,
            patientEmail: appt.patient.user.email,
            error,
          });
        }
      }),
    );

    logger.info("Appointment reminder job completed.");
  },
);

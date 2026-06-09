import httpStatus from "http-status";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../errors/AppError.js";
import { Prisma } from "@prisma/client";
import { CreatePrescriptionInput, UpdatePrescriptionInput } from "./prescriptions.types.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Verify the appointment belongs to the given doctor and patient,
 * and is in a state that allows a prescription (confirmed / completed).
 */
async function validateAppointmentOwnership(appointmentId: number, doctorId: number, patientId: number) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    throw new AppError("Appointment not found", httpStatus.NOT_FOUND);
  }

  if (appointment.doctorId !== doctorId || appointment.patientId !== patientId) {
    throw new AppError(
      "You are not authorised to write a prescription for this appointment",
      httpStatus.FORBIDDEN,
    );
  }

  // Allow writing prescriptions for confirmed or completed appointments
  const allowedStatuses = ["CONFIRMED", "COMPLETED"];
  if (!allowedStatuses.includes(appointment.appointmentStatus)) {
    throw new AppError(
      `Cannot write prescription for an appointment with status: ${appointment.appointmentStatus}`,
      httpStatus.BAD_REQUEST,
    );
  }

  return appointment;
}

// ─── Service methods ──────────────────────────────────────────────────────────

/**
 * Create a new prescription (one per appointment).
 */
const createPrescription = async (data: CreatePrescriptionInput) => {
  const { appointmentId, doctorId, patientId, medicines, followUpDate, ...rest } = data;

  await validateAppointmentOwnership(appointmentId, doctorId, patientId);

  // Ensure we don't create duplicates
  const existing = await prisma.prescription.findUnique({
    where: { appointmentId },
  });
  if (existing) {
    throw new AppError(
      "A prescription already exists for this appointment. Use update instead.",
      httpStatus.CONFLICT,
    );
  }

  const prescription = await prisma.prescription.create({
    data: {
      appointmentId,
      doctorId,
      patientId,
      followUpDate: followUpDate ? new Date(followUpDate) : undefined,
      ...rest,
      content: rest.content as Prisma.InputJsonValue,
      medicines: {
        create: medicines.map((m) => ({
          medicineName: m.medicineName,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          instruction: m.instruction,
        })),
      },
    },
    include: {
      medicines: true,
      doctor: {
        include: {
          user: { select: { id: true, publicId: true, name: true, email: true, profileImage: true } },
        },
      },
      patient: {
        include: {
          user: { select: { id: true, publicId: true, name: true, email: true, profileImage: true } },
        },
      },
      appointment: true,
    },
  });

  return prescription;
};

/**
 * Update an existing prescription (replaces medicine list).
 */
const updatePrescription = async (publicId: string, doctorId: number, data: UpdatePrescriptionInput) => {
  const existing = await prisma.prescription.findUnique({
    where: { publicId },
  });
  if (!existing) {
    throw new AppError("Prescription not found", httpStatus.NOT_FOUND);
  }
  if (existing.doctorId !== doctorId) {
    throw new AppError("You can only edit your own prescriptions", httpStatus.FORBIDDEN);
  }

  const { medicines, followUpDate, ...rest } = data;

  // Use a transaction to replace medicines atomically
  const updated = await prisma.$transaction(async (tx) => {
    if (medicines !== undefined) {
      await tx.prescriptionMedicine.deleteMany({
        where: { prescriptionId: existing.id },
      });
    }

    return tx.prescription.update({
      where: { publicId },
      data: {
        followUpDate: followUpDate ? new Date(followUpDate) : undefined,
        ...rest,
        content: rest.content as Prisma.InputJsonValue,
        ...(medicines !== undefined && {
          medicines: {
            create: medicines.map((m) => ({
              medicineName: m.medicineName,
              dosage: m.dosage,
              frequency: m.frequency,
              duration: m.duration,
              instruction: m.instruction,
            })),
          },
        }),
      },
      include: {
        medicines: true,
        doctor: {
          include: {
            user: { select: { id: true, publicId: true, name: true, email: true, profileImage: true } },
          },
        },
        patient: {
          include: {
            user: { select: { id: true, publicId: true, name: true, email: true, profileImage: true } },
          },
        },
        appointment: true,
      },
    });
  });

  return updated;
};

/**
 * Get prescription by appointment ID.
 * Works for both doctor (writing) and patient (viewing).
 */
const getPrescriptionByAppointment = async (
  appointmentId: number,
  requesterId: number,
  requesterRole: string,
) => {
  const prescription = await prisma.prescription.findUnique({
    where: { appointmentId },
    include: {
      medicines: true,
      doctor: {
        include: {
          user: { select: { id: true, publicId: true, name: true, email: true, profileImage: true } },
        },
      },
      patient: {
        include: {
          user: { select: { id: true, publicId: true, name: true, email: true, profileImage: true } },
        },
      },
      appointment: true,
    },
  });

  if (!prescription) {
    throw new AppError("No prescription found for this appointment", httpStatus.NOT_FOUND);
  }

  // Access control: doctor can only see their own, patient only theirs
  if (requesterRole === "doctor" && prescription.doctorId !== requesterId) {
    throw new AppError("Access denied", httpStatus.FORBIDDEN);
  }
  if (requesterRole === "patient" && prescription.patientId !== requesterId) {
    throw new AppError("Access denied", httpStatus.FORBIDDEN);
  }

  return prescription;
};

/**
 * Get prescription by publicId.
 */
const getPrescriptionById = async (publicId: string, requesterId: number, requesterRole: string) => {
  const prescription = await prisma.prescription.findUnique({
    where: { publicId },
    include: {
      medicines: true,
      doctor: {
        include: {
          user: { select: { id: true, publicId: true, name: true, email: true, profileImage: true } },
        },
      },
      patient: {
        include: {
          user: { select: { id: true, publicId: true, name: true, email: true, profileImage: true } },
        },
      },
      appointment: true,
    },
  });

  if (!prescription) {
    throw new AppError("Prescription not found", httpStatus.NOT_FOUND);
  }

  if (requesterRole === "doctor" && prescription.doctorId !== requesterId) {
    throw new AppError("Access denied", httpStatus.FORBIDDEN);
  }
  if (requesterRole === "patient" && prescription.patientId !== requesterId) {
    throw new AppError("Access denied", httpStatus.FORBIDDEN);
  }

  return prescription;
};

/**
 * List all prescriptions for a patient (their history).
 */
const getPatientPrescriptions = async (patientId: number, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const [prescriptions, total] = await prisma.$transaction([
    prisma.prescription.findMany({
      where: { patientId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        medicines: true,
        doctor: {
          include: {
            user: { select: { id: true, publicId: true, name: true, email: true, profileImage: true } },
          },
        },
        appointment: true,
      },
    }),
    prisma.prescription.count({ where: { patientId } }),
  ]);

  return {
    prescriptions,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

/**
 * List all prescriptions written by a doctor.
 */
const getDoctorPrescriptions = async (doctorId: number, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const [prescriptions, total] = await prisma.$transaction([
    prisma.prescription.findMany({
      where: { doctorId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        medicines: true,
        patient: {
          include: {
            user: { select: { id: true, publicId: true, name: true, email: true, profileImage: true } },
          },
        },
        appointment: true,
      },
    }),
    prisma.prescription.count({ where: { doctorId } }),
  ]);

  return {
    prescriptions,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

const PrescriptionService = {
  createPrescription,
  updatePrescription,
  getPrescriptionByAppointment,
  getPrescriptionById,
  getPatientPrescriptions,
  getDoctorPrescriptions,
};

export default PrescriptionService;

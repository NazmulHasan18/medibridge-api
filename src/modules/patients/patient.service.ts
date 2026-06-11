import { prisma } from "../../lib/prisma.js";

const fetchMyPatient = async (userId: number) => {
  const doctor = await prisma.doctor.findUniqueOrThrow({
    where: { userId },
  });

  return await prisma.patient.findMany({
    where: {
      appointments: {
        some: {
          doctorId: doctor.id,
        },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          publicId: true,
          name: true,
          email: true,
          address: true,
          phone: true,
          profileImage: true,
        },
      },
    },
  });
};

const fetchPatientAppointment = async (docUserId: number, patientId: string) => {
  const doctor = await prisma.doctor.findUniqueOrThrow({
    where: { userId: docUserId },
  });
  // findFirstOrThrow
  return await prisma.patient.findUniqueOrThrow({
    where: {
      publicId: patientId,
      appointments: {
        some: {
          doctorId: doctor.id,
        },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          publicId: true,
          name: true,
          email: true,
          address: true,
          phone: true,
          profileImage: true,
        },
      },
      appointments: true,
    },
  });
};

export const patientService = { fetchMyPatient, fetchPatientAppointment };

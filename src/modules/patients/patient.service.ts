import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { FetchPatientsQuery } from "./patient.types.js";

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

const fetchAllPatients = async (query: FetchPatientsQuery) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const where: Prisma.PatientWhereInput = {};

  if (query.searchTerm) {
    where.user = {
      name: {
        contains: query.searchTerm,
        mode: "insensitive",
      },
    };
  }

  const [patients, total] = await prisma.$transaction([
    prisma.patient.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            publicId: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            profileImage: true,
          },
        },
      },
    }),

    prisma.patient.count({
      where,
    }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: patients,
  };
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

const fetchPatientAllAppointment = async (patientId: string, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const patient = await prisma.patient.findUniqueOrThrow({
    where: {
      publicId: patientId,
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

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        patientId: patient.id,
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.appointment.count({
      where: {
        patientId: patient.id,
      },
    }),
  ]);

  return {
    data: { patient, appointments },
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const patientService = {
  fetchMyPatient,
  fetchPatientAppointment,
  fetchAllPatients,
  fetchPatientAllAppointment,
};

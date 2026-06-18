import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../errors/AppError.js";

const getAllDoctor = async ({
  search,
  specialization,
  page = 1,
  limit = 10,
}: {
  search?: string;
  specialization?: string;
  page?: number;
  limit?: number;
}) => {
  const where: Prisma.DoctorWhereInput = {
    deletedAt: null,
    ...(search && {
      user: {
        name: {
          contains: search,
          mode: "insensitive",
        },
      },
    }),
    ...(specialization && {
      specialization: {
        contains: specialization,
        mode: "insensitive",
      },
    }),
  };

  const [doctors, total, specializations] = await Promise.all([
    prisma.doctor.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            profileImage: true,
            publicId: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { id: "desc" },
    }),
    prisma.doctor.count({ where }),
    // always fetch ALL distinct specializations (no where filter)
    prisma.doctor.findMany({
      select: { specialization: true },
      distinct: ["specialization"],
      orderBy: { specialization: "asc" },
    }),
  ]);

  return {
    data: doctors,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    specializations: specializations.map((s: { specialization: string }) => s.specialization),
  };
};

const fetchAllDoctor = async ({
  search,
  specialization,
  page = 1,
  limit = 10,
}: {
  search?: string;
  specialization?: string;
  page?: number;
  limit?: number;
}) => {
  const where: Prisma.DoctorWhereInput = {
    ...(search && {
      user: {
        name: {
          contains: search,
          mode: "insensitive",
        },
      },
    }),
    ...(specialization && {
      specialization: {
        contains: specialization,
        mode: "insensitive",
      },
    }),
  };

  const [doctors, total, specializations] = await Promise.all([
    prisma.doctor.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            profileImage: true,
            publicId: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { id: "desc" },
    }),
    prisma.doctor.count({ where }),
    // always fetch ALL distinct specializations (no where filter)
    prisma.doctor.findMany({
      select: { specialization: true },
      distinct: ["specialization"],
      orderBy: { specialization: "asc" },
    }),
  ]);

  return {
    data: doctors,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    specializations: specializations.map((s: { specialization: string }) => s.specialization),
  };
};

const getDoctorById = async (publicId: string) => {
  const doctor = await prisma.doctor.findUniqueOrThrow({
    where: { publicId, deletedAt: null },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          profileImage: true,
          publicId: true,
        },
      },
    },
  });

  if (!doctor) {
    throw new AppError("Doctor not found", 404);
  }

  return doctor;
};

const deleteDoctor = async (publicId: string) => {
  const doctor = await prisma.doctor.findUniqueOrThrow({ where: { publicId, deletedAt: null } });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: doctor.userId, deletedAt: null } });

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { deletedAt: new Date(), status: "BLOCKED" } }),
    prisma.doctor.update({ where: { id: doctor.id }, data: { deletedAt: new Date() } }),
  ]);

  return true;
};

const updateDoctor = async (publicId: string, data: Partial<Prisma.DoctorUpdateInput>) => {
  const doctor = await prisma.doctor.findUniqueOrThrow({ where: { publicId, deletedAt: null } });

  const updatedDoctor = await prisma.doctor.update({
    where: { id: doctor.id, deletedAt: null },
    data,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          profileImage: true,
          publicId: true,
        },
      },
    },
  });

  return updatedDoctor;
};

const getAllAvailableDoctor = async ({
  specialization,
  appointmentDate,
}: {
  specialization: string;
  appointmentDate: string;
}) => {
  const requestedDate = new Date(appointmentDate);

  const startOfDay = new Date(requestedDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(requestedDate);
  endOfDay.setHours(23, 59, 59, 999);

  // ==========================================================
  // Step 1: Check requested date
  // ==========================================================

  const doctors = await prisma.doctor.findMany({
    where: {
      specialization,

      doctorSlots: {
        some: {
          startTime: {
            gte: startOfDay,
            lte: endOfDay,
          },
          isBooked: false,
          isCancelled: false,
        },
      },
    },

    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          profileImage: true,
          publicId: true,
        },
      },
    },
  });

  if (doctors.length) {
    return {
      available: true,
      requestedDate,
      availableDate: requestedDate,
      doctors,
    };
  }

  // ==========================================================
  // Step 2: Find nearest available slot after requested date
  // ==========================================================

  const nextSlot = await prisma.doctorSlot.findFirst({
    where: {
      isBooked: false,
      isCancelled: false,

      startTime: {
        gt: endOfDay,
      },

      doctor: {
        specialization,
      },
    },

    orderBy: {
      startTime: "asc",
    },
  });

  if (!nextSlot) {
    return {
      available: false,
      requestedDate,
      availableDate: null,
      doctors: [],
      message: "No available doctors were found for the selected specialization.",
    };
  }

  const nextStart = new Date(nextSlot.startTime);
  nextStart.setHours(0, 0, 0, 0);

  const nextEnd = new Date(nextSlot.startTime);
  nextEnd.setHours(23, 59, 59, 999);

  const nextAvailableDoctors = await prisma.doctor.findMany({
    where: {
      specialization,

      doctorSlots: {
        some: {
          startTime: {
            gte: nextStart,
            lte: nextEnd,
          },
          isBooked: false,
          isCancelled: false,
        },
      },
    },

    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          profileImage: true,
          publicId: true,
        },
      },
    },
  });

  return {
    available: false,
    requestedDate,
    availableDate: nextStart,
    doctors: nextAvailableDoctors,
    message: "No doctors are available on the selected date. Showing the nearest available date.",
  };
};

const getAllSpecialization = async () => {
  const doctors = await prisma.doctor.findMany({
    select: { specialization: true },
    distinct: ["specialization"],
    orderBy: { specialization: "asc" },
  });

  const specializations = doctors.map((doc) => doc.specialization);
  return specializations;
};

export const DoctorService = {
  getAllDoctor,
  fetchAllDoctor,
  getDoctorById,
  deleteDoctor,
  updateDoctor,
  getAllAvailableDoctor,
  getAllSpecialization,
};

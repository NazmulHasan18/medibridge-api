import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import httpStatus from "http-status";
import { Prisma, UserRole, UserStatus } from "@prisma/client";

import { prisma } from "../../lib/prisma.js";
import AppError from "../../errors/AppError.js";
import type { CreateUserPayload } from "./user.validations.js";

const generateReferralCode = () => nanoid(8).toUpperCase();

const createUser = async (data: CreateUserPayload) => {
  const { doctor, password, referredByCode, ...user } = data;

  const existingUser = await prisma.user.findUnique({
    where: {
      email: user.email,
    },
  });

  if (existingUser) {
    throw new AppError("User already exists", httpStatus.BAD_REQUEST);
  }

  const userData: Prisma.UserCreateInput = {
    ...user,
    password: password ? await bcrypt.hash(password, 12) : null,
    regType: password ? "EMAIL" : "GOOGLE",
    referralCode: generateReferralCode(),
  };

  if (user.role === "PATIENT") {
    userData.patient = {
      create: {},
    };

    userData.wallet = {
      create: {},
    };
  }

  if (user.role === "DOCTOR" && doctor) {
    userData.doctor = {
      create: {
        specialization: doctor.specialization,
        experience: doctor.experience ?? 0,
        consultationFee: doctor.consultationFee ?? 0,
        qualification: doctor.qualification ?? "",
        bio: doctor.bio ?? "",
      },
    };
  }

  return prisma.user.create({
    data: userData,
    include: {
      doctor: true,
      patient: true,
      wallet: true,
    },
  });
};

interface GetUsersParams {
  page?: number;
  limit?: number;
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

const getUsers = async ({
  page = 1,
  limit = 10,
  role,
  status,
  search,
  sortBy = "createdAt",
  sortOrder = "desc",
}: GetUsersParams) => {
  const where: Prisma.UserWhereInput = {
    deletedAt: null,
  };

  if (role) where.role = role;

  if (status) where.status = status;

  if (search) {
    where.OR = [
      {
        name: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        phone: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),

    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        doctor: true,
        patient: true,
        wallet: true,
      },
      omit: {
        password: true,
      },
    }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: users,
  };
};

const getUserById = async (id: number) => {
  return prisma.user.findUniqueOrThrow({
    where: {
      id,
    },
    include: {
      doctor: true,
      patient: true,
      wallet: true,
    },
    omit: {
      password: true,
    },
  });
};

const updateUser = async (id: number, payload: Prisma.UserUpdateInput) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
  });

  await prisma.user.update({
    where: { id },
    data: payload,
  });

  return getUserById(user.id);
};

const updateDoctor = async (userId: number, payload: Prisma.DoctorUpdateInput) => {
  return prisma.doctor.update({
    where: {
      userId,
    },
    data: payload,
  });
};

const updateStatus = async (id: number, status: UserStatus) => {
  return prisma.user.update({
    where: {
      id,
    },
    data: {
      status,
    },
  });
};

const updateRole = async (id: number, role: UserRole) => {
  return prisma.user.update({
    where: {
      id,
    },
    data: {
      role,
    },
  });
};

const deleteUser = async (id: number) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id,
    },
  });

  if (user.role === "SUPER_ADMIN") {
    throw new AppError("Super Admin can't be deleted", httpStatus.BAD_REQUEST);
  }

  await prisma.user.update({
    where: {
      id,
    },
    data: {
      deletedAt: new Date(),
      status: "BLOCKED",
    },
  });

  if (user.role === "DOCTOR") {
    await prisma.doctor.update({
      where: {
        userId: id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  if (user.role === "PATIENT") {
    await prisma.patient.update({
      where: {
        userId: id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  return {
    message: "User deleted successfully",
  };
};

const restoreUser = async (id: number) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
  });

  await prisma.user.update({
    where: { id },
    data: {
      deletedAt: null,
      status: "ACTIVE",
    },
  });

  if (user.role === "DOCTOR") {
    await prisma.doctor.update({
      where: { userId: id },
      data: {
        deletedAt: null,
      },
    });
  }

  if (user.role === "PATIENT") {
    await prisma.patient.update({
      where: { userId: id },
      data: {
        deletedAt: null,
      },
    });
  }

  return {
    message: "User restored successfully",
  };
};

const permanentlyDeleteUser = async (id: number) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id,
    },
  });

  if (user.role === "SUPER_ADMIN") {
    throw new AppError("Super Admin can't be deleted", httpStatus.BAD_REQUEST);
  }

  return prisma.user.delete({
    where: {
      id,
    },
  });
};

const bulkUpdateStatus = async (ids: number[], status: UserStatus) => {
  return prisma.user.updateMany({
    where: {
      id: {
        in: ids,
      },
    },
    data: {
      status,
    },
  });
};

const getStatistics = async () => {
  const [totalUsers, totalDoctors, totalPatients, totalAdmins, blockedUsers, activeUsers, deletedUsers] =
    await Promise.all([
      prisma.user.count(),

      prisma.user.count({
        where: { role: "DOCTOR" },
      }),

      prisma.user.count({
        where: { role: "PATIENT" },
      }),

      prisma.user.count({
        where: {
          role: {
            in: ["ADMIN", "SUPER_ADMIN"],
          },
        },
      }),

      prisma.user.count({
        where: {
          status: "BLOCKED",
        },
      }),

      prisma.user.count({
        where: {
          status: "ACTIVE",
        },
      }),

      prisma.user.count({
        where: {
          deletedAt: {
            not: null,
          },
        },
      }),
    ]);

  return {
    totalUsers,
    totalDoctors,
    totalPatients,
    totalAdmins,
    blockedUsers,
    activeUsers,
    deletedUsers,
  };
};

const getRecentUsers = async (limit = 10) => {
  return prisma.user.findMany({
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
    omit: {
      password: true,
    },
  });
};

const exportUsers = async () => {
  return prisma.user.findMany({
    omit: {
      password: true,
    },
  });
};

export const UserService = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  updateDoctor,
  updateStatus,
  updateRole,
  deleteUser,
  restoreUser,
  permanentlyDeleteUser,
  bulkUpdateStatus,
  getStatistics,
  getRecentUsers,
  exportUsers,
};

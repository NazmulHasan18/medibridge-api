import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma.js";
import type { CreateUserPayload } from "./user.validations.js";
import { nanoid } from "nanoid";
import { Prisma, UserRole } from "@prisma/client";
import AppError from "../../errors/AppError.js";
import httpStatus from "http-status";

const generateReferralCode = () => {
  return nanoid(8).toUpperCase();
};

const createUser = async (data: CreateUserPayload) => {
  const { doctor, password, referredByCode, ...user } = data;
  // check existing user

  const existingUser = await prisma.user.findUnique({
    where: {
      email: user.email,
    },
  });

  if (existingUser) {
    throw new Error("User already exists");
  }

  const userData: Prisma.UserCreateInput = {
    ...user,

    password: password ? await bcrypt.hash(password, 12) : null,

    regType: password ? "EMAIL" : "GOOGLE",

    referralCode: generateReferralCode(),
  };

  // patient
  if (data.role === "PATIENT") {
    userData.patient = {
      create: {},
    };

    userData.wallet = {
      create: {},
    };
  }

  // doctor
  if (data.role === "DOCTOR" && doctor) {
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

  // transaction later:
  // handle referral reward

  return prisma.user.create({
    data: userData,

    include: {
      doctor: true,
      patient: true,
      wallet: true,
    },
  });
};

const fetchAllUserByRole = async (role: UserRole, page = 1, limit = 10) => {
  const [total, users] = await Promise.all([
    prisma.user.count({ where: { role } }),
    prisma.user.findMany({
      where: { role },
      skip: (page - 1) * limit,
      include: { patient: true, doctor: true },
      omit: { password: true },
    }),
  ]);

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data: users,
  };
};

const deleteUser = async (userId: number) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const role = user.role;
  if (role === "SUPER_ADMIN") {
    throw new AppError("Super admin can't be deleted", httpStatus.BAD_REQUEST);
  }
  await prisma.user.update({
    where: { id: userId },
    data: {
      deletedAt: new Date(),
      status: "BLOCKED",
    },
  });
  if (role === "DOCTOR") {
    await prisma.doctor.update({
      where: { userId },
      data: {
        deletedAt: new Date(),
      },
    });
  } else if (role === "PATIENT") {
    await prisma.patient.update({
      where: { userId },
      data: {
        deletedAt: new Date(),
      },
    });
  }
  return { message: "User deleted successfully" };
};

export const UserService = {
  createUser,
  fetchAllUserByRole,
  deleteUser,
};

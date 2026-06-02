import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma.js";
import type { CreateUserPayload } from "./user.validations.js";
import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";

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

export const UserService = {
  createUser,
};

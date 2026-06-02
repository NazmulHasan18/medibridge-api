import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

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
      orderBy: { createdAt: "desc" },
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

export const DoctorService = {
  getAllDoctor,
};

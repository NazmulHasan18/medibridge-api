import { Prisma } from "@prisma/client";
import AppError from "../../errors/AppError.js";
import { prisma } from "../../lib/prisma.js";
import { TransactionQuery } from "./transaction.validation.js";

// ─── Get paginated transactions for the logged-in patient ───────────────────
const getMyTransactions = async (userId: number, query: TransactionQuery) => {
  const { page, limit, type, status, from, to } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.TransactionWhereInput = {
    userId,
    ...(type && { type }),
    ...(status && { status }),
    ...(from || to
      ? {
          createdAt: {
            ...(from && { gte: from }),
            ...(to && { lte: to }),
          },
        }
      : {}),
  };

  const [total, transactions] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        publicId: true,
        type: true,
        status: true,
        amount: true,
        previousBalance: true,
        currentBalance: true,
        note: true,
        createdAt: true,
        appointment: {
          select: {
            publicId: true,
            appointmentDate: true,
            doctor: {
              select: {
                user: { select: { name: true, profileImage: true } },
                specialization: true,
              },
            },
          },
        },
        payment: {
          select: {
            publicId: true,
            gateway: true,
            paymentStatus: true,
          },
        },
      },
    }),
  ]);

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data: transactions,
  };
};

// ─── Get single transaction detail ──────────────────────────────────────────
const getTransactionByPublicId = async (userId: number, publicId: string) => {
  const transaction = await prisma.transaction.findUnique({
    where: { publicId },
    include: {
      appointment: {
        include: {
          doctor: {
            include: {
              user: { select: { name: true, email: true, profileImage: true } },
            },
          },
        },
      },
      payment: true,
    },
  });

  if (!transaction) throw new AppError("Transaction not found", 404);
  if (transaction.userId !== userId) throw new AppError("Forbidden", 403);

  return transaction;
};

const getTransactionSummary = async (userId: number) => {
  const byType = await prisma.transaction.groupBy({
    by: ["type"],
    where: { userId, status: "SUCCESS" },
    _sum: { amount: true },
    _count: { id: true },
  });

  const byStatus = await prisma.transaction.groupBy({
    by: ["status"],
    where: { userId },
    _count: { id: true },
  });

  const latest = await prisma.transaction.findFirst({
    where: { userId, status: "SUCCESS" },
    orderBy: { createdAt: "desc" },
    select: { currentBalance: true },
  });

  // ✅ FIXED TYPES
  const typeBreakdown: Record<string, { count: number; amount: number }> = {};

  for (const row of byType) {
    typeBreakdown[row.type] = {
      count: row._count.id,
      amount: row._sum.amount ?? 0,
    };
  }

  const statusBreakdown: Record<string, number> = {};

  for (const row of byStatus) {
    statusBreakdown[row.status] = row._count.id;
  }

  return {
    currentBalance: latest?.currentBalance ?? 0,
    totalSpent: typeBreakdown["APPOINTMENT_PAYMENT"]?.amount ?? 0,
    totalRefunded: typeBreakdown["REFUND"]?.amount ?? 0,
    breakdown: typeBreakdown,
    byStatus: statusBreakdown,
  };
};

export const transactionService = {
  getMyTransactions,
  getTransactionByPublicId,
  getTransactionSummary,
};

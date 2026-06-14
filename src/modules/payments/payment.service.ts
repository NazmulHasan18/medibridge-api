import { PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../errors/AppError.js";

// ─── Get paginated payments for the logged-in patient ───────────────────────
const getMyPayments = async (
  userId: number,
  query: { page?: number; limit?: number; paymentStatus?: PaymentStatus; from?: Date; to?: Date },
) => {
  const { page = 1, limit = 10, paymentStatus, from, to } = query;
  const skip = (page - 1) * limit;

  // Payment has no direct userId — must go through appointment.patientId
  const where: Prisma.PaymentWhereInput = {
    appointment: { userId },
    ...(paymentStatus && { paymentStatus }),
    ...(from || to
      ? {
          createdAt: {
            ...(from && { gte: from }),
            ...(to && { lte: to }),
          },
        }
      : {}),
  };

  const [total, payments] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        publicId: true,
        amount: true,
        gateway: true,
        transactionId: true,
        paymentStatus: true,
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
      },
    }),
  ]);

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data: payments,
  };
};

// ─── Get single payment detail ───────────────────────────────────────────────
const getPaymentByPublicId = async (userId: number, publicId: string) => {
  const payment = await prisma.payment.findUnique({
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
      transactions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!payment) throw new AppError("Payment not found", 404);
  if (payment.appointment.userId !== userId) throw new AppError("Forbidden", 403);

  return payment;
};

// ─── Get payment by appointment publicId ────────────────────────────────────
const getPaymentByAppointment = async (userId: number, appointmentPublicId: string) => {
  const appointment = await prisma.appointment.findUnique({
    where: { publicId: appointmentPublicId },
    select: { id: true, userId: true },
  });

  if (!appointment) throw new AppError("Appointment not found", 404);
  if (appointment.userId !== userId) throw new AppError("Forbidden", 403);

  const payment = await prisma.payment.findUnique({
    where: { appointmentId: appointment.id },
    include: {
      transactions: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!payment) throw new AppError("No payment found for this appointment", 404);

  return payment;
};

export const paymentService = {
  getMyPayments,
  getPaymentByPublicId,
  getPaymentByAppointment,
};

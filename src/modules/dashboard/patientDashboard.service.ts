import { prisma } from "../../lib/prisma.js";

// ─── Overview stats ──────────────────────────────────────────────────────────
const getPatientOverview = async (userId: number) => {
  const now = new Date();

  const [
    totalAppointments,
    upcomingAppointments,
    completedAppointments,
    cancelledAppointments,
    totalSpentResult,
    wallet,
  ] = await Promise.all([
    // Total appointments
    prisma.appointment.count({ where: { userId: userId } }),

    // Upcoming (scheduled, future date)
    prisma.appointment.count({
      where: {
        userId: userId,
        appointmentStatus: "CONFIRMED",
        appointmentDate: { gte: now },
      },
    }),

    // Completed
    prisma.appointment.count({
      where: { userId, appointmentStatus: "COMPLETED" },
    }),

    // Cancelled
    prisma.appointment.count({
      where: { userId, appointmentStatus: "CANCELLED" },
    }),

    // Total amount spent (successful payments)
    prisma.payment.aggregate({
      where: {
        appointment: { userId },
        paymentStatus: "SUCCESS",
      },
      _sum: { amount: true },
    }),

    // Wallet balance
    prisma.wallet.findUnique({
      where: { userId },
      select: { balance: true },
    }),
  ]);

  return {
    appointments: {
      total: totalAppointments,
      upcoming: upcomingAppointments,
      completed: completedAppointments,
      cancelled: cancelledAppointments,
    },
    financials: {
      totalSpent: totalSpentResult._sum.amount ?? 0,
      walletBalance: wallet?.balance ?? 0,
    },
  };
};

// ─── Recent activity (latest payments + transactions interleaved) ─────────────
const getRecentActivity = async (userId: number, limit = 10) => {
  const [recentPayments, recentTransactions] = await Promise.all([
    prisma.payment.findMany({
      where: { appointment: { userId } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        publicId: true,
        amount: true,
        gateway: true,
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

    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        publicId: true,
        type: true,
        status: true,
        amount: true,
        currentBalance: true,
        note: true,
        createdAt: true,
      },
    }),
  ]);

  // Tag each item with a kind so the frontend can distinguish them
  const tagged = [
    ...recentPayments.map((p) => ({ kind: "payment", ...p })),
    ...recentTransactions.map((t) => ({ kind: "transaction", ...t })),
  ];

  // Sort merged list by createdAt desc and return top N
  tagged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return tagged.slice(0, limit);
};

export const patientDashboardService = { getPatientOverview, getRecentActivity };

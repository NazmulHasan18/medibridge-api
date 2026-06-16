import { AppointmentStatus, PaymentStatus, TransactionType, UserStatus } from "@prisma/client";
import AppError from "../../errors/AppError.js";
import { prisma } from "../../lib/prisma.js";
import {
  IAdminDashboardStats,
  IAppointmentStatusBreakdown,
  IDashboardQuery,
  IDoctorDashboardStats,
  IRevenueChartData,
} from "./dashboard.types.js";
import httpStatus from "http-status";

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

const getDoctorDashboardStats = async (
  userId: number,
  query: IDashboardQuery,
): Promise<IDoctorDashboardStats> => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId, deletedAt: null },
  });

  if (!doctor) {
    throw new AppError("Doctor profile not found", httpStatus.NOT_FOUND);
  }

  const doctorId = doctor.id;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const dateFilter: any = {};
  if (query.startDate) dateFilter.gte = new Date(query.startDate);
  if (query.endDate) dateFilter.lte = new Date(query.endDate);

  const baseWhere: any = { doctorId };
  if (query.startDate || query.endDate) {
    baseWhere.appointmentDate = dateFilter;
  }

  const [
    totalAppointments,
    todayAppointments,
    pendingAppointments,
    completedAppointments,
    cancelledAppointments,
    upcomingAppointments,
    distinctPatients,
    earningsResult,
  ] = await Promise.all([
    prisma.appointment.count({ where: baseWhere }),

    prisma.appointment.count({
      where: {
        doctorId,
        appointmentDate: { gte: todayStart, lte: todayEnd },
      },
    }),

    prisma.appointment.count({
      where: { ...baseWhere, appointmentStatus: AppointmentStatus.PENDING },
    }),

    prisma.appointment.count({
      where: { ...baseWhere, appointmentStatus: AppointmentStatus.COMPLETED },
    }),

    prisma.appointment.count({
      where: { ...baseWhere, appointmentStatus: AppointmentStatus.CANCELLED },
    }),

    prisma.appointment.count({
      where: {
        doctorId,
        appointmentDate: { gte: new Date() },
        appointmentStatus: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PAID] },
      },
    }),

    prisma.appointment.findMany({
      where: baseWhere,
      select: { patientId: true },
      distinct: ["patientId"],
    }),

    prisma.payment.aggregate({
      where: {
        appointment: { doctorId },
        paymentStatus: PaymentStatus.SUCCESS,
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalAppointments,
    todayAppointments,
    pendingAppointments,
    completedAppointments,
    cancelledAppointments,
    totalPatients: distinctPatients.length,
    totalEarnings: earningsResult._sum.amount || 0,
    upcomingAppointments,
  };
};

const getDoctorAppointmentBreakdown = async (userId: number): Promise<IAppointmentStatusBreakdown[]> => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId, deletedAt: null },
  });

  if (!doctor) {
    throw new AppError("Doctor profile not found", httpStatus.NOT_FOUND);
  }

  const result = await prisma.appointment.groupBy({
    by: ["appointmentStatus"],
    where: { doctorId: doctor.id },
    _count: { _all: true },
  });

  return result.map((r) => ({
    status: r.appointmentStatus,
    count: r._count._all,
  }));
};

const getDoctorRecentAppointments = async (userId: number, limit: number) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId, deletedAt: null },
  });

  if (!doctor) {
    throw new AppError("Doctor profile not found", httpStatus.NOT_FOUND);
  }

  return prisma.appointment.findMany({
    where: { doctorId: doctor.id },
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      publicId: true,
      patientName: true,
      consultationType: true,
      appointmentStatus: true,
      appointmentDate: true,
      createdAt: true,
      patient: {
        select: {
          publicId: true,
          user: { select: { name: true, email: true, phone: true, profileImage: true } },
        },
      },
    },
  });
};

const getDoctorUpcomingSchedule = async (userId: number, limit: number) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId, deletedAt: null },
  });

  if (!doctor) {
    throw new AppError("Doctor profile not found", httpStatus.NOT_FOUND);
  }

  return prisma.doctorSlot.findMany({
    where: {
      doctorId: doctor.id,
      isBooked: true,
      isCancelled: false,
      startTime: { gte: new Date() },
    },
    take: limit,
    orderBy: { startTime: "asc" },
    include: {
      appointment: {
        select: {
          publicId: true,
          patientName: true,
          consultationType: true,
          appointmentStatus: true,
        },
      },
    },
  });
};

// =========================== ADMIN DASHBOARD ===========================

const getAdminDashboardStats = async (query: IDashboardQuery): Promise<IAdminDashboardStats> => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const dateFilter: any = {};
  if (query.startDate) dateFilter.gte = new Date(query.startDate);
  if (query.endDate) dateFilter.lte = new Date(query.endDate);

  const appointmentWhere: any = {};
  if (query.startDate || query.endDate) {
    appointmentWhere.appointmentDate = dateFilter;
  }

  const [
    totalUsers,
    totalDoctors,
    totalPatients,
    totalAppointments,
    todayAppointments,
    pendingAppointments,
    completedAppointments,
    cancelledAppointments,
    revenueResult,
    refundResult,
    activeUsers,
    blockedUsers,
    pendingUsers,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),

    prisma.doctor.count({ where: { deletedAt: null } }),

    prisma.patient.count({ where: { deletedAt: null } }),

    prisma.appointment.count({ where: appointmentWhere }),

    prisma.appointment.count({
      where: { appointmentDate: { gte: todayStart, lte: todayEnd } },
    }),

    prisma.appointment.count({
      where: { ...appointmentWhere, appointmentStatus: AppointmentStatus.PENDING },
    }),

    prisma.appointment.count({
      where: { ...appointmentWhere, appointmentStatus: AppointmentStatus.COMPLETED },
    }),

    prisma.appointment.count({
      where: { ...appointmentWhere, appointmentStatus: AppointmentStatus.CANCELLED },
    }),

    prisma.payment.aggregate({
      where: { paymentStatus: PaymentStatus.SUCCESS },
      _sum: { amount: true },
    }),

    prisma.transaction.aggregate({
      where: {
        type: TransactionType.REFUND,
        status: "SUCCESS",
      },
      _sum: { amount: true },
    }),

    prisma.user.count({ where: { status: UserStatus.ACTIVE, deletedAt: null } }),

    prisma.user.count({ where: { status: UserStatus.BLOCKED, deletedAt: null } }),

    prisma.user.count({ where: { status: UserStatus.PENDING, deletedAt: null } }),
  ]);

  return {
    totalUsers,
    totalDoctors,
    totalPatients,
    totalAppointments,
    todayAppointments,
    pendingAppointments,
    completedAppointments,
    cancelledAppointments,
    totalRevenue: revenueResult._sum.amount || 0,
    totalRefunded: refundResult._sum.amount || 0,
    activeUsers,
    blockedUsers,
    pendingUsers,
  };
};

const getAdminAppointmentBreakdown = async (): Promise<IAppointmentStatusBreakdown[]> => {
  const result = await prisma.appointment.groupBy({
    by: ["appointmentStatus"],
    _count: { _all: true },
  });

  return result.map((r) => ({
    status: r.appointmentStatus,
    count: r._count._all,
  }));
};

const getAdminUserRoleBreakdown = async () => {
  const result = await prisma.user.groupBy({
    by: ["role"],
    where: { deletedAt: null },
    _count: { _all: true },
  });

  return result.map((r) => ({
    role: r.role,
    count: r._count._all,
  }));
};

const getAdminRevenueChart = async (
  startDate?: string,
  endDate?: string,
  groupBy: "day" | "week" | "month" = "day",
): Promise<IRevenueChartData[]> => {
  const where: any = { paymentStatus: PaymentStatus.SUCCESS };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const payments = await prisma.payment.findMany({
    where,
    select: { amount: true, createdAt: true },
  });

  const grouped: Record<string, { revenue: number; appointments: number }> = {};

  payments.forEach((payment) => {
    let key: string;
    const date = new Date(payment.createdAt);

    if (groupBy === "month") {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    } else if (groupBy === "week") {
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDays = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNum = Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7);
      key = `${date.getFullYear()}-W${weekNum}`;
    } else {
      key = date.toISOString().split("T")[0];
    }

    if (!grouped[key]) {
      grouped[key] = { revenue: 0, appointments: 0 };
    }

    grouped[key].revenue += payment.amount;
    grouped[key].appointments += 1;
  });

  return Object.entries(grouped)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

const getAdminRecentAppointments = async (limit: number) => {
  return prisma.appointment.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      publicId: true,
      patientName: true,
      consultationType: true,
      appointmentStatus: true,
      appointmentDate: true,
      createdAt: true,
      doctor: {
        select: {
          publicId: true,
          specialization: true,
          user: { select: { name: true } },
        },
      },
      patient: {
        select: {
          publicId: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  });
};

const getAdminRecentTransactions = async (limit: number) => {
  return prisma.transaction.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      publicId: true,
      type: true,
      status: true,
      amount: true,
      previousBalance: true,
      currentBalance: true,
      createdAt: true,
      user: {
        select: { publicId: true, name: true, email: true, role: true },
      },
    },
  });
};

const getAdminTopDoctors = async (limit: number) => {
  const result = await prisma.appointment.groupBy({
    by: ["doctorId"],
    where: { appointmentStatus: AppointmentStatus.COMPLETED },
    _count: { _all: true },
    orderBy: { _count: { doctorId: "desc" } },
    take: limit,
  });

  const doctorIds = result.map((r) => r.doctorId);

  const doctors = await prisma.doctor.findMany({
    where: { id: { in: doctorIds } },
    select: {
      id: true,
      publicId: true,
      specialization: true,
      consultationFee: true,
      user: { select: { name: true, profileImage: true } },
    },
  });

  return result.map((r) => {
    const doctor = doctors.find((d) => d.id === r.doctorId);
    return {
      doctor,
      completedAppointments: r._count._all,
    };
  });
};

export const dashboardService = {
  getPatientOverview,
  getRecentActivity,
  getDoctorDashboardStats,
  getDoctorAppointmentBreakdown,
  getDoctorRecentAppointments,
  getDoctorUpcomingSchedule,
  getAdminDashboardStats,
  getAdminAppointmentBreakdown,
  getAdminUserRoleBreakdown,
  getAdminRevenueChart,
  getAdminRecentAppointments,
  getAdminRecentTransactions,
  getAdminTopDoctors,
};

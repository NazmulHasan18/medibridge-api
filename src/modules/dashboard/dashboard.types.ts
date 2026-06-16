export type IDoctorDashboardStats = {
  totalAppointments: number;
  todayAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  totalPatients: number;
  totalEarnings: number;
  upcomingAppointments: number;
};

export type IAdminDashboardStats = {
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  totalAppointments: number;
  todayAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  totalRevenue: number;
  totalRefunded: number;
  activeUsers: number;
  blockedUsers: number;
  pendingUsers: number;
};

export type IDashboardQuery = {
  startDate?: string;
  endDate?: string;
  limit?: string;
};

export type IRevenueChartData = {
  date: string;
  revenue: number;
  appointments: number;
};

export type IAppointmentStatusBreakdown = {
  status: string;
  count: number;
};

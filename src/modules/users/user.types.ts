import { UserRole, UserStatus } from "@prisma/client";

export interface GetUsersParams {
  page?: number;
  limit?: number;
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

import { User } from "../../generated/prisma/client";

export interface JwtPayload {
  id: number;
  email: string;
  name: string;
  publicId: string;
  regType: string;
  role: string;
  status: string;
  profileImage: string | null;
}

export interface SessionPayload {
  id: number;
  publicId: string;
  email: string;
}

export type SafeUser = Omit<User, "password">;

import bcrypt from "bcrypt";
import { SafeUser } from "./auth.type.js";
import { prisma } from "../../lib/prisma.js";
import AppError from "../../errors/AppError.js";
import { RegistrationType, UserRole, UserStatus, User } from "@prisma/client";
import {
  buildAccessPayload,
  signAccessToken,
  signSessionToken,
  verifySessionToken,
} from "../../utils/token.js";
import { UserService } from "../users/user.service.js";

// ─── Helpers ────────────────────────────────────────────────
const excludePassword = (user: User): SafeUser => {
  const { password, ...safe } = user;
  return safe;
};

// ─── Login ──────────────────────────────────────────────────
const login = async (payload: { email: string; password: string }) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
    include: { doctor: true, patient: true },
  });

  if (!user) throw new AppError("No account found with this email", 404);

  // Block Google-registered users from password login
  if (user.regType === "GOOGLE") {
    throw new AppError("This account uses Google sign-in. Please login with Google", 403);
  }

  if (!user.password) throw new AppError("Account has no password set", 400);

  const isMatch = await bcrypt.compare(payload.password, user.password);
  if (!isMatch) throw new AppError("Incorrect password", 400);

  if (user.status === UserStatus.BLOCKED) throw new AppError("Your account has been suspended", 403);
  if (user.status === UserStatus.PENDING) throw new AppError("Please verify your email first", 403);

  // future improve: store access token

  const accessTokenPayload = buildAccessPayload(user as never);
  const accessToken = signAccessToken(accessTokenPayload);
  const sessionToken = signSessionToken({
    id: user.id,
    publicId: user.publicId,
    email: user.email,
  });

  return {
    user: excludePassword(user as never),
    accessToken,
    sessionToken,
  };
};

// ─── Refresh Access Token (from session token) ──────────────
const refreshAccessToken = async (payload: { sessionToken: string }) => {
  let decoded;
  try {
    decoded = verifySessionToken(payload.sessionToken);
  } catch (e) {
    console.log(e);
    throw new AppError("Session expired, please login again", 401);
  }

  // Re-fetch user to get latest role/status (not stale JWT data)
  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user) throw new AppError("User no longer exists", 404);
  if (user.status === UserStatus.BLOCKED) throw new AppError("Your account has been suspended", 403);

  const accessToken = signAccessToken(buildAccessPayload(user as never));
  return { accessToken };
};

// ─── Google Login / Register ─────────────────────────────────
const googleLogin = async (payload: { email: string; name: string; image?: string; googleId?: string }) => {
  let user = await prisma.user.findUnique({ where: { email: payload.email } });

  if (user && user.regType === RegistrationType.EMAIL) {
    // Existing credentials user — link Google to their account
    user = await prisma.user.update({
      where: { email: payload.email },
      data: { regType: "GOOGLE" },
    });
  }

  if (!user) {
    user = await UserService.createUser({
      email: payload.email,
      name: payload.name,
      profileImage: payload?.image,
      regType: RegistrationType.GOOGLE,
      role: UserRole.PATIENT,
      status: UserStatus.ACTIVE,
    });
  }

  if (user.status === UserStatus.BLOCKED) throw new AppError("Your account has been suspended", 403);

  const accessToken = signAccessToken(buildAccessPayload(user as never));
  const sessionToken = signSessionToken({
    id: user.id,
    publicId: user.publicId,
    email: user.email,
  });

  return {
    user: excludePassword(user as never),
    accessToken,
    sessionToken,
  };
};

// ─── Logout ─────────────────────────────────────────────────

const logout = async (payload: { sessionToken: string }) => {
  let decoded;
  try {
    decoded = verifySessionToken(payload.sessionToken);
  } catch {
    throw new AppError("Invalid or expired session", 401);
  }

  // !future improve
  // Option A (recommended): store session tokens in DB and delete here
  // await prisma.session.deleteMany({ where: { userId: decoded.id } });

  // Option B: set a tokenVersion on user and increment it on logout;
  // verify tokenVersion in every JWT middleware check
  //   await prisma.user.update({
  //     where: { id: decoded.id },
  //     data: { tokenVersion: { increment: 1 } },
  //   });

  return { message: "Logged out successfully" };
};

// ─── Get Me ──────────────────────────────────────────────────
const getMe = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      doctor: true,
      patient: true,
      wallet: true,
    },
  });
  if (!user) throw new AppError("User not found", 404);
  return excludePassword(user as never);
};

export const AuthService = {
  login,
  refreshAccessToken,
  googleLogin,
  logout,
  getMe,
};

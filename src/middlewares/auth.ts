import { NextFunction, Request, Response } from "express";
import AppError from "../errors/AppError.js";
import { prisma } from "../lib/prisma.js";
import type { JwtPayload as AuthJwtPayload } from "../modules/auth/auth.type.js";
import { verifyAccessToken } from "../utils/token.js";
import { UserRole, UserStatus } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: AuthJwtPayload;
    }
  }
}

const getTokenFromHeader = (authorization?: string): string => {
  if (!authorization) {
    throw new AppError("Authorization token is required", 401);
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new AppError("Invalid authorization format", 401);
  }

  return token;
};

export const auth =
  (...requiredRoles: UserRole[]) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = getTokenFromHeader(req.headers.authorization);
      const decoded = verifyAccessToken(token) as AuthJwtPayload;

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user) {
        throw new AppError("User no longer exists", 401);
      }

      if (user.status === UserStatus.BLOCKED) {
        throw new AppError("Your account has been suspended", 403);
      }

      console.log(requiredRoles.length, requiredRoles.includes(user.role), user.role, requiredRoles);

      if (requiredRoles.length && !requiredRoles.includes(user.role)) {
        throw new AppError("You are not authorized to access this resource", 403);
      }

      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        publicId: user.publicId,
        regType: user.regType,
        role: user.role,
        status: user.status,
        profileImage: user.profileImage,
      };

      next();
    } catch (error) {
      next(error);
    }
  };

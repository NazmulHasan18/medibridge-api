import jwt, { JwtPayload } from "jsonwebtoken";
import { config } from "../config";
import { SessionPayload } from "../modules/auth/auth.type.js";

export const signAccessToken = (payload: JwtPayload): string =>
  jwt.sign(payload, config.accessSecret, { expiresIn: "24h" });

export const signSessionToken = (payload: SessionPayload): string =>
  jwt.sign(payload, config.sessionSecret, { expiresIn: "7 days" });

export const verifyAccessToken = (token: string): JwtPayload =>
  jwt.verify(token, config.accessSecret) as JwtPayload;

export const verifySessionToken = (token: string): SessionPayload =>
  jwt.verify(token, config.sessionSecret) as SessionPayload;

export const buildAccessPayload = (user: JwtPayload): JwtPayload => ({
  id: user.id,
  email: user.email,
  name: user.name,
  publicId: user.publicId,
  regType: user.regType,
  role: user.role,
  status: user.status,
  profileImage: user.profileImage,
});

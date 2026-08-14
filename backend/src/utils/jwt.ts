import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AppJwtPayload {
  userId: string;
  email: string;
}

export function signAppJwt(payload: AppJwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyAppJwt(token: string): AppJwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as AppJwtPayload;
}

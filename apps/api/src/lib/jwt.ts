import jwt from "jsonwebtoken";
import "dotenv/config";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "premayeso-access-dev-secret";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "premayeso-refresh-dev-secret";
const ACCESS_TTL = "1h";
const REFRESH_TTL = "30d";

export interface AccessPayload {
  sub: string;   // user id
  phone: string;
  role: string;
}

export interface RefreshPayload {
  sub: string;
  jti: string;   // unique token id stored in otp_logs for revocation
}

export function signAccess(payload: AccessPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}

export function signRefresh(payload: RefreshPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

export function verifyAccess(token: string): AccessPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessPayload;
}

export function verifyRefresh(token: string): RefreshPayload {
  return jwt.verify(token, REFRESH_SECRET) as RefreshPayload;
}

export function getBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

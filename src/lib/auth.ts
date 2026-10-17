import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

const JWT_SECRET_STRING = process.env.JWT_SECRET || "direct-sell-master-secret-key-32chars-secure-2026-pwa";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
export const COOKIE_NAME = "direct_sell_session";
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
}

/**
 * Sign a JWT session token
 */
export async function signSessionToken(payload: SessionPayload, rememberMe: boolean = false): Promise<string> {
  const expiration = rememberMe ? "30d" : "24h";
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiration)
    .sign(JWT_SECRET);
}

/**
 * Verify a JWT session token
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

/**
 * Get current session user from request cookies
 */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Perform login authentication with rate-limiting & brute force lockout protection
 */
export async function authenticateUser(identifier: string, passwordPlain: string, rememberMe: boolean = false) {
  const trimmed = identifier.trim().toLowerCase();

  // Find user by email or phone
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: trimmed },
        { phone: trimmed },
      ],
      deletedAt: null,
    },
  });

  if (!user) {
    return { success: false, error: "Invalid credentials. Please check your email/phone and password." };
  }

  // Check if locked out
  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    const diffMs = user.lockoutUntil.getTime() - Date.now();
    const diffMins = Math.ceil(diffMs / (1000 * 60));
    return {
      success: false,
      error: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${diffMins} minute(s).`,
      isLocked: true,
      lockoutMinutes: diffMins,
    };
  }

  // Check if account is active
  if (!user.isActive) {
    return { success: false, error: "This account has been deactivated. Please contact support." };
  }

  // Verify password
  const isMatch = await bcrypt.compare(passwordPlain, user.passwordHash);

  if (!isMatch) {
    const newFailed = user.failedAttempts + 1;
    let lockoutDate: Date | null = null;

    if (newFailed >= MAX_FAILED_ATTEMPTS) {
      lockoutDate = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: newFailed,
        lockoutUntil: lockoutDate,
      },
    });

    if (lockoutDate) {
      return {
        success: false,
        error: `Too many failed attempts. Your account is locked for ${LOCKOUT_MINUTES} minutes for security.`,
        isLocked: true,
        lockoutMinutes: LOCKOUT_MINUTES,
      };
    }

    const remaining = MAX_FAILED_ATTEMPTS - newFailed;
    return {
      success: false,
      error: `Invalid credentials. ${remaining} attempt(s) remaining before security lockout.`,
    };
  }

  // Reset failed attempts & update last login
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedAttempts: 0,
      lockoutUntil: null,
      lastLoginAt: new Date(),
    },
  });

  // Create session payload
  const sessionPayload: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  const token = await signSessionToken(sessionPayload, rememberMe);

  return {
    success: true,
    user: sessionPayload,
    token,
    maxAge: rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
  };
}

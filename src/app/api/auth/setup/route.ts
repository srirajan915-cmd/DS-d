import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";

const setupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").trim(),
  email: z.string().email("Please enter a valid email address").trim().toLowerCase(),
  phone: z.string().min(10, "Phone number must be at least 10 digits").trim(),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  masterKey: z.string().optional(),
});

// POST /api/auth/setup - Protected Admin profile & credentials updater
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = setupSchema.parse(body);

    // Find existing primary admin
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN", deletedAt: null },
      orderBy: { createdAt: "asc" },
    });

    // Check authorization: Must be an authenticated ADMIN or have the Server Master Key
    const currentUser = await getCurrentUser();
    const serverMasterKey = process.env.ADMIN_RECOVERY_KEY || process.env.JWT_SECRET || "direct-sell-master-secret-key-32chars-secure-2026-pwa";
    const authHeader = request.headers.get("authorization");

    const hasValidMasterKey =
      authHeader === `Bearer ${serverMasterKey}` ||
      (validated.masterKey && validated.masterKey.trim() === serverMasterKey.trim());
    const isAuthedAdmin = currentUser && currentUser.role === "ADMIN";

    // If an admin already exists, strictly require authenticated ADMIN session or Master Key
    if (existingAdmin && !isAuthedAdmin && !hasValidMasterKey) {
      return NextResponse.json(
        { error: "Access Denied: Admin credentials are protected. Please sign in to your dashboard to change details." },
        { status: 403 }
      );
    }

    let passwordHash: string | undefined = undefined;
    if (validated.password && validated.password.length >= 6) {
      passwordHash = await bcrypt.hash(validated.password, 10);
    }

    let user;

    if (existingAdmin) {
      const updateData: {
        name: string;
        email: string;
        phone: string;
        passwordHash?: string;
        failedAttempts: number;
        lockoutUntil: null;
      } = {
        name: validated.name,
        email: validated.email,
        phone: validated.phone,
        failedAttempts: 0,
        lockoutUntil: null,
      };

      if (passwordHash) {
        updateData.passwordHash = passwordHash;
      }

      user = await prisma.user.update({
        where: { id: existingAdmin.id },
        data: updateData,
      });
    } else {
      if (!passwordHash) {
        return NextResponse.json(
          { error: "Password of at least 6 characters is required for initial admin setup." },
          { status: 400 }
        );
      }
      user = await prisma.user.create({
        data: {
          name: validated.name,
          email: validated.email,
          phone: validated.phone,
          passwordHash,
          role: "ADMIN",
          isActive: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Admin credentials safely updated for ${user.email}.`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Admin setup error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update admin credentials." },
      { status: 500 }
    );
  }
}

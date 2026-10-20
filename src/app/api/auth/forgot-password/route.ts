import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { identifier, newPassword, recoveryKey } = await request.json();

    if (!identifier || !newPassword) {
      return NextResponse.json(
        { error: "Identifier and new password are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const serverMasterKey = process.env.ADMIN_RECOVERY_KEY || process.env.JWT_SECRET || "direct-sell-master-secret-key-32chars-secure-2026-pwa";

    if (!recoveryKey || recoveryKey.trim() !== serverMasterKey.trim()) {
      return NextResponse.json(
        { error: "Access Denied: Invalid Master Security Recovery Key. Password reset is restricted to the authorized system owner." },
        { status: 403 }
      );
    }

    const trimmed = identifier.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: trimmed }, { phone: trimmed }],
        deletedAt: null,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account found matching this email or phone number." },
        { status: 404 }
      );
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        failedAttempts: 0,
        lockoutUntil: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully! You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process password reset." },
      { status: 500 }
    );
  }
}

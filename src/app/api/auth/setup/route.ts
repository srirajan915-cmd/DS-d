import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const setupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").trim(),
  email: z.string().email("Please enter a valid email address").trim().toLowerCase(),
  phone: z.string().min(10, "Phone number must be at least 10 digits").trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// POST /api/auth/setup - Set or customize admin account details
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = setupSchema.parse(body);

    const passwordHash = await bcrypt.hash(validated.password, 10);

    // Find existing primary admin or first user
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN", deletedAt: null },
      orderBy: { createdAt: "asc" },
    });

    let user;

    if (existingAdmin) {
      user = await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          name: validated.name,
          email: validated.email,
          phone: validated.phone,
          passwordHash,
          failedAttempts: 0,
          lockoutUntil: null,
        },
      });
    } else {
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
      message: `Admin credentials updated successfully! You can now log in with ${user.email}.`,
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

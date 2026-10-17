import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  dsCode: z.string().min(2, "DS Code is required").trim(),
  name: z.string().min(2, "Name is required").trim(),
  phone: z.string().min(10, "Valid 10-digit phone number is required").trim(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  category: z.enum(["SAO", "SGO"]),
  uplineCode: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  notes: z.string().optional().nullable(),
  joiningDate: z.string().optional().nullable(),
});

// GET /api/direct-sellers/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const ds = await prisma.directSeller.findFirst({
      where: { id, isDeleted: false },
      include: {
        followUps: {
          where: { isDeleted: false },
          orderBy: { followUpDate: "desc" },
          include: { product: true },
        },
        orders: {
          where: { isDeleted: false },
          orderBy: { orderDate: "desc" },
          include: {
            items: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (!ds) {
      return NextResponse.json({ error: "Direct Seller not found" }, { status: 404 });
    }

    // Also fetch downlines if any
    const downlines = await prisma.directSeller.findMany({
      where: {
        uplineCode: ds.dsCode,
        isDeleted: false,
      },
      select: {
        id: true,
        dsCode: true,
        name: true,
        category: true,
        status: true,
        phone: true,
        city: true,
      },
    });

    return NextResponse.json({ ds, downlines });
  } catch (error) {
    console.error("Get DS detail error:", error);
    return NextResponse.json({ error: "Failed to fetch Direct Seller details" }, { status: 500 });
  }
}

// PUT /api/direct-sellers/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const validated = updateSchema.parse(body);

    // Verify existing record
    const existing = await prisma.directSeller.findUnique({ where: { id } });
    if (!existing || existing.isDeleted) {
      return NextResponse.json({ error: "Direct Seller not found" }, { status: 404 });
    }

    // Check duplicate code if changed
    if (validated.dsCode.toUpperCase() !== existing.dsCode) {
      const codeTaken = await prisma.directSeller.findFirst({
        where: {
          dsCode: validated.dsCode.toUpperCase(),
          id: { not: id },
          isDeleted: false,
        },
      });
      if (codeTaken) {
        return NextResponse.json(
          { error: `DS Code '${validated.dsCode}' is already used by another member.` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.directSeller.update({
      where: { id },
      data: {
        dsCode: validated.dsCode.toUpperCase(),
        name: validated.name,
        phone: validated.phone,
        address: validated.address || null,
        city: validated.city || null,
        category: validated.category,
        uplineCode: validated.uplineCode ? validated.uplineCode.toUpperCase() : null,
        status: validated.status,
        notes: validated.notes || null,
        joiningDate: validated.joiningDate ? new Date(validated.joiningDate) : existing.joiningDate,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "UPDATE",
        entity: "DS",
        entityId: id,
        details: JSON.stringify({ dsCode: updated.dsCode, name: updated.name }),
      },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Update DS error:", error);
    return NextResponse.json({ error: "Failed to update Direct Seller" }, { status: 500 });
  }
}

// DELETE /api/direct-sellers/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.directSeller.findUnique({ where: { id } });
    if (!existing || existing.isDeleted) {
      return NextResponse.json({ error: "Direct Seller not found" }, { status: 404 });
    }

    // Soft delete
    await prisma.directSeller.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "DELETE",
        entity: "DS",
        entityId: id,
        details: JSON.stringify({ dsCode: existing.dsCode, name: existing.name }),
      },
    });

    return NextResponse.json({ success: true, message: "Direct Seller soft-deleted successfully" });
  } catch (error) {
    console.error("Delete DS error:", error);
    return NextResponse.json({ error: "Failed to delete Direct Seller" }, { status: 500 });
  }
}

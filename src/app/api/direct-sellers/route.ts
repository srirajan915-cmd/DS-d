import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const directSellerSchema = z.object({
  dsCode: z.string().min(2, "DS Code is required").trim(),
  name: z.string().min(2, "Name is required").trim(),
  phone: z.string().min(10, "Valid 10-digit phone number is required").trim(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  category: z.enum(["SAO", "SGO"]),
  uplineCode: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  notes: z.string().optional().nullable(),
  joiningDate: z.string().optional().nullable(),
});

// GET /api/direct-sellers
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "ALL"; // ALL | SAO | SGO
  const status = searchParams.get("status") || "ALL"; // ALL | ACTIVE | INACTIVE
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

  const where: any = {
    isDeleted: false,
  };

  if (category && category !== "ALL") {
    where.category = category;
  }

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (search.trim()) {
    const term = search.trim();
    where.OR = [
      { name: { contains: term } },
      { phone: { contains: term } },
      { dsCode: { contains: term } },
      { city: { contains: term } },
    ];
  }

  try {
    const [total, items, saoCount, sgoCount] = await Promise.all([
      prisma.directSeller.count({ where }),
      prisma.directSeller.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.directSeller.count({ where: { isDeleted: false, category: "SAO" } }),
      prisma.directSeller.count({ where: { isDeleted: false, category: "SGO" } }),
    ]);

    return NextResponse.json({
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      counts: {
        all: saoCount + sgoCount,
        sao: saoCount,
        sgo: sgoCount,
      },
    });
  } catch (error) {
    console.error("Fetch DS error:", error);
    return NextResponse.json({ error: "Failed to fetch Direct Sellers" }, { status: 500 });
  }
}

// POST /api/direct-sellers
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = directSellerSchema.parse(body);

    // Check duplicate dsCode
    const existing = await prisma.directSeller.findFirst({
      where: {
        dsCode: validated.dsCode,
        isDeleted: false,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Direct Seller Code '${validated.dsCode}' is already registered.` },
        { status: 400 }
      );
    }

    const joiningDate = validated.joiningDate
      ? new Date(validated.joiningDate)
      : new Date();

    const created = await prisma.directSeller.create({
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
        joiningDate,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "CREATE",
        entity: "DS",
        entityId: created.id,
        details: JSON.stringify({ dsCode: created.dsCode, name: created.name }),
      },
    });

    return NextResponse.json({ success: true, item: created });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Create DS error:", error);
    return NextResponse.json({ error: "Failed to create Direct Seller" }, { status: 500 });
  }
}

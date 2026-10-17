import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const createFollowUpSchema = z.object({
  type: z.enum(["PRODUCT", "DS"]),
  personType: z.enum(["CUSTOMER", "DS"]),
  directSellerId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  customerData: z
    .object({
      name: z.string().min(1, "Name is required"),
      phone: z.string().min(10, "Phone is required"),
      city: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  productId: z.string().optional().nullable(),
  followUpDate: z.string().min(1, "Follow-up date is required"),
  notes: z.string().optional().nullable(),
  status: z.enum(["PENDING", "FOLLOWED_UP", "RESCHEDULED"]).default("PENDING"),
});

// GET /api/follow-ups
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "ALL"; // ALL | PRODUCT | DS
  const timing = searchParams.get("timing") || "ALL"; // ALL | TODAY | OVERDUE | UPCOMING
  const status = searchParams.get("status") || "ALL";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const where: any = { isDeleted: false };

  if (type !== "ALL") {
    where.type = type;
  }

  if (status !== "ALL") {
    where.status = status;
  }

  if (timing === "TODAY") {
    where.followUpDate = { gte: today, lt: tomorrow };
  } else if (timing === "OVERDUE") {
    where.followUpDate = { lt: today };
    where.status = "PENDING";
  } else if (timing === "UPCOMING") {
    where.followUpDate = { gte: tomorrow };
  }

  if (search.trim()) {
    const term = search.trim();
    where.OR = [
      { notes: { contains: term } },
      { customer: { name: { contains: term } } },
      { customer: { phone: { contains: term } } },
      { directSeller: { name: { contains: term } } },
      { directSeller: { dsCode: { contains: term } } },
      { directSeller: { phone: { contains: term } } },
      { product: { name: { contains: term } } },
    ];
  }

  try {
    // Metric counts across all active follow-ups
    const [allCount, todayCount, overdueCount, productCount, dsCount] = await Promise.all([
      prisma.followUp.count({ where: { isDeleted: false } }),
      prisma.followUp.count({
        where: {
          isDeleted: false,
          status: "PENDING",
          followUpDate: { gte: today, lt: tomorrow },
        },
      }),
      prisma.followUp.count({
        where: {
          isDeleted: false,
          status: "PENDING",
          followUpDate: { lt: today },
        },
      }),
      prisma.followUp.count({ where: { isDeleted: false, type: "PRODUCT" } }),
      prisma.followUp.count({ where: { isDeleted: false, type: "DS" } }),
    ]);

    const [total, items] = await Promise.all([
      prisma.followUp.count({ where }),
      prisma.followUp.findMany({
        where,
        orderBy: [{ followUpDate: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          customer: true,
          directSeller: true,
          product: true,
        },
      }),
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
        all: allCount,
        today: todayCount,
        overdue: overdueCount,
        product: productCount,
        ds: dsCount,
      },
    });
  } catch (error) {
    console.error("Fetch follow-ups error:", error);
    return NextResponse.json({ error: "Failed to fetch follow-ups" }, { status: 500 });
  }
}

// POST /api/follow-ups
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = createFollowUpSchema.parse(body);

    let customerId = validated.customerId || null;
    let directSellerId = validated.directSellerId || null;

    if (validated.personType === "CUSTOMER") {
      if (!customerId && validated.customerData) {
        const existing = await prisma.customer.findFirst({
          where: { phone: validated.customerData.phone.trim(), isDeleted: false },
        });
        if (existing) {
          customerId = existing.id;
        } else {
          const newC = await prisma.customer.create({
            data: {
              name: validated.customerData.name.trim(),
              phone: validated.customerData.phone.trim(),
              city: validated.customerData.city?.trim() || null,
            },
          });
          customerId = newC.id;
        }
      }
      if (!customerId) {
        return NextResponse.json({ error: "Customer details are required." }, { status: 400 });
      }
    } else if (validated.personType === "DS") {
      if (!directSellerId) {
        return NextResponse.json({ error: "Direct Seller selection is required." }, { status: 400 });
      }
    }

    const created = await prisma.followUp.create({
      data: {
        type: validated.type,
        personType: validated.personType,
        directSellerId,
        customerId,
        productId: validated.productId || null,
        followUpDate: new Date(validated.followUpDate),
        notes: validated.notes || null,
        status: validated.status,
      },
      include: {
        customer: true,
        directSeller: true,
        product: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "CREATE",
        entity: "FOLLOWUP",
        entityId: created.id,
        details: JSON.stringify({ type: created.type, date: created.followUpDate }),
      },
    });

    return NextResponse.json({ success: true, item: created });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Create follow-up error:", error);
    return NextResponse.json({ error: "Failed to schedule follow-up" }, { status: 500 });
  }
}

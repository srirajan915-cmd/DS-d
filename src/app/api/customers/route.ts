import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  const where: any = { isDeleted: false };
  if (search.trim()) {
    const term = search.trim();
    where.OR = [
      { name: { contains: term } },
      { phone: { contains: term } },
      { city: { contains: term } },
    ];
  }

  try {
    const customers = await prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      take: 20,
    });
    return NextResponse.json({ customers });
  } catch (error) {
    console.error("Fetch customers error:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, phone, city, address, notes } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone number are required." }, { status: 400 });
    }

    const created = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        city: city?.trim() || null,
        address: address?.trim() || null,
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, customer: created });
  } catch (error) {
    console.error("Create customer error:", error);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}

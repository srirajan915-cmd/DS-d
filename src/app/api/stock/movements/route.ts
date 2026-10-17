import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  const where: any = {};
  if (productId) {
    where.productId = productId;
  }

  try {
    const movements = await prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        product: {
          select: { name: true, sku: true },
        },
      },
    });

    return NextResponse.json({ movements });
  } catch (error) {
    console.error("Fetch movements error:", error);
    return NextResponse.json({ error: "Failed to fetch stock movements" }, { status: 500 });
  }
}

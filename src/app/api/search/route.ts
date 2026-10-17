import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";

  if (q.length < 2) {
    return NextResponse.json({ directSellers: [], customers: [], products: [], orders: [] });
  }

  try {
    const [directSellers, customers, products, orders] = await Promise.all([
      // 1. Direct Sellers
      prisma.directSeller.findMany({
        where: {
          isDeleted: false,
          OR: [
            { name: { contains: q } },
            { phone: { contains: q } },
            { dsCode: { contains: q } },
            { city: { contains: q } },
          ],
        },
        take: 5,
        select: {
          id: true,
          dsCode: true,
          name: true,
          phone: true,
          category: true,
          status: true,
          city: true,
        },
      }),

      // 2. Customers
      prisma.customer.findMany({
        where: {
          isDeleted: false,
          OR: [{ name: { contains: q } }, { phone: { contains: q } }, { city: { contains: q } }],
        },
        take: 5,
        select: { id: true, name: true, phone: true, city: true },
      }),

      // 3. Products
      prisma.product.findMany({
        where: {
          isDeleted: false,
          OR: [{ name: { contains: q } }, { sku: { contains: q } }, { category: { contains: q } }],
        },
        take: 5,
        select: {
          id: true,
          sku: true,
          name: true,
          category: true,
          mrp: true,
          dp: true,
          currentStock: true,
          reorderLevel: true,
        },
      }),

      // 4. Orders
      prisma.order.findMany({
        where: {
          isDeleted: false,
          orderNumber: { contains: q },
        },
        take: 5,
        select: {
          id: true,
          orderNumber: true,
          orderDate: true,
          orderType: true,
          totalAmount: true,
          paymentStatus: true,
        },
      }),
    ]);

    return NextResponse.json({
      directSellers,
      customers,
      products,
      orders,
      totalCount: directSellers.length + customers.length + products.length + orders.length,
    });
  } catch (error) {
    console.error("Global search error:", error);
    return NextResponse.json({ error: "Failed to perform search" }, { status: 500 });
  }
}

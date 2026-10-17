import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(2, "Product name is required").trim(),
  sku: z.string().min(2, "SKU is required").trim(),
  category: z.string().default("WELLNESS"),
  mrp: z.number().min(0, "MRP must be a positive number"),
  dp: z.number().min(0, "DP must be a positive number"),
  currentStock: z.number().int().min(0).default(0),
  reorderLevel: z.number().int().min(0).default(5),
  batchNumber: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
});

// GET /api/stock
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const filter = searchParams.get("filter") || "ALL"; // ALL | LOW_STOCK | OUT_OF_STOCK
  const category = searchParams.get("category") || "ALL"; // ALL | specific category
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

  try {
    const allProducts = await prisma.product.findMany({
      where: { isDeleted: false },
    });

    // Calculate metrics and category distribution counts
    const totalProducts = allProducts.length;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalInventoryValueDP = 0;
    let totalInventoryValueMRP = 0;
    const categoryCounts: Record<string, number> = {};

    allProducts.forEach((p) => {
      const cat = p.category || "WELLNESS";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      if (p.currentStock <= 0) {
        outOfStockCount++;
      } else if (p.currentStock <= p.reorderLevel) {
        lowStockCount++;
      }
      totalInventoryValueDP += p.currentStock * p.dp;
      totalInventoryValueMRP += p.currentStock * p.mrp;
    });

    // Apply filters
    let filteredProducts = allProducts;

    // 1. Category filter
    if (category !== "ALL") {
      filteredProducts = filteredProducts.filter(
        (p) => (p.category || "WELLNESS").toUpperCase() === category.toUpperCase()
      );
    }

    // 2. Search filter
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      filteredProducts = filteredProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term) ||
          (p.category && p.category.toLowerCase().includes(term)) ||
          (p.batchNumber && p.batchNumber.toLowerCase().includes(term))
      );
    }

    // 3. Stock level filter
    if (filter === "LOW_STOCK") {
      filteredProducts = filteredProducts.filter(
        (p) => p.currentStock > 0 && p.currentStock <= p.reorderLevel
      );
    } else if (filter === "OUT_OF_STOCK") {
      filteredProducts = filteredProducts.filter((p) => p.currentStock <= 0);
    }

    const total = filteredProducts.length;
    const paginatedItems = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

    return NextResponse.json({
      items: paginatedItems,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      metrics: {
        totalProducts,
        lowStockCount,
        outOfStockCount,
        totalInventoryValueDP,
        totalInventoryValueMRP,
        categoryCounts,
      },
    });
  } catch (error) {
    console.error("Fetch stock error:", error);
    return NextResponse.json({ error: "Failed to fetch stock inventory" }, { status: 500 });
  }
}

// POST /api/stock
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = productSchema.parse(body);

    const skuUpper = validated.sku.toUpperCase();

    // Check duplicate SKU
    const existing = await prisma.product.findFirst({
      where: { sku: skuUpper, isDeleted: false },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Product with SKU '${skuUpper}' already exists.` },
        { status: 400 }
      );
    }

    const expiryDate = validated.expiryDate ? new Date(validated.expiryDate) : null;

    // Create product and initial stock movement in transaction
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: validated.name,
          sku: skuUpper,
          category: validated.category || "WELLNESS",
          mrp: validated.mrp,
          dp: validated.dp,
          currentStock: validated.currentStock,
          reorderLevel: validated.reorderLevel,
          batchNumber: validated.batchNumber || null,
          expiryDate,
        },
      });

      if (validated.currentStock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: created.id,
            type: "IN",
            quantity: validated.currentStock,
            previousStock: 0,
            newStock: validated.currentStock,
            referenceType: "MANUAL",
            notes: "Initial inventory registration",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user.userId,
          action: "CREATE",
          entity: "PRODUCT",
          entityId: created.id,
          details: JSON.stringify({ sku: created.sku, initialStock: created.currentStock }),
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, item: result });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Create product error:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

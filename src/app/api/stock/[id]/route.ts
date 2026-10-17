import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/stock/[id]
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
    const product = await prisma.product.findFirst({
      where: { id, isDeleted: false },
      include: {
        stockMovements: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Get product error:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

// PUT /api/stock/[id]
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
    const existing = await prisma.product.findUnique({ where: { id } });

    if (!existing || existing.isDeleted) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if SKU changed and is already taken
    if (body.sku && body.sku.toUpperCase() !== existing.sku) {
      const skuTaken = await prisma.product.findFirst({
        where: {
          sku: body.sku.toUpperCase(),
          id: { not: id },
          isDeleted: false,
        },
      });
      if (skuTaken) {
        return NextResponse.json(
          { error: `SKU '${body.sku}' is already assigned to another product.` },
          { status: 400 }
        );
      }
    }

    // Check if this is an inventory stock adjustment
    if (body.adjustType && body.adjustQuantity !== undefined) {
      const qty = parseInt(body.adjustQuantity, 10);
      const prevStock = existing.currentStock;
      let newStock = prevStock;
      let movementType = "ADJUSTMENT";

      if (body.adjustType === "IN") {
        newStock = prevStock + qty;
        movementType = "IN";
      } else if (body.adjustType === "OUT") {
        if (prevStock < qty) {
          return NextResponse.json(
            { error: `Cannot deduct ${qty} units. Current stock is only ${prevStock}.` },
            { status: 400 }
          );
        }
        newStock = prevStock - qty;
        movementType = "OUT";
      } else if (body.adjustType === "SET") {
        newStock = qty;
        movementType = "ADJUSTMENT";
      }

      const updated = await prisma.$transaction(async (tx) => {
        const prod = await tx.product.update({
          where: { id },
          data: { currentStock: newStock },
        });

        await tx.stockMovement.create({
          data: {
            productId: id,
            type: movementType,
            quantity: Math.abs(newStock - prevStock),
            previousStock: prevStock,
            newStock,
            referenceType: "MANUAL",
            notes: body.reason || "Manual stock adjustment",
          },
        });

        await tx.auditLog.create({
          data: {
            userId: user.userId,
            action: "STOCK_UPDATE",
            entity: "PRODUCT",
            entityId: id,
            details: JSON.stringify({ prevStock, newStock, reason: body.reason }),
          },
        });

        return prod;
      });

      return NextResponse.json({ success: true, item: updated });
    }

    // Standard product master update
    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : existing.name,
        sku: body.sku !== undefined ? body.sku.toUpperCase() : existing.sku,
        category: body.category !== undefined ? body.category : existing.category,
        mrp: body.mrp !== undefined ? parseFloat(body.mrp) : existing.mrp,
        dp: body.dp !== undefined ? parseFloat(body.dp) : existing.dp,
        reorderLevel:
          body.reorderLevel !== undefined ? parseInt(body.reorderLevel, 10) : existing.reorderLevel,
        batchNumber: body.batchNumber !== undefined ? body.batchNumber : existing.batchNumber,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : existing.expiryDate,
      },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

// DELETE /api/stock/[id]
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
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing || existing.isDeleted) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await prisma.product.update({
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
        entity: "PRODUCT",
        entityId: id,
        details: JSON.stringify({ sku: existing.sku, name: existing.name }),
      },
    });

    return NextResponse.json({ success: true, message: "Product soft-deleted successfully" });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}

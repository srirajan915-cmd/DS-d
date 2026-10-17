import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/orders/[id]
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
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        directSeller: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (!order || order.isDeleted) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Get order error:", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

// DELETE /api/orders/[id] - Cancel order with stock reversal
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
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });

    if (!order || order.isDeleted) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.isCancelled) {
      return NextResponse.json({ error: "Order is already cancelled." }, { status: 400 });
    }

    // Atomic stock restoration
    await prisma.$transaction(async (tx) => {
      // 1. Mark order cancelled
      await tx.order.update({
        where: { id },
        data: {
          isCancelled: true,
          cancelledAt: new Date(),
        },
      });

      // 2. Reverse stock for each line item
      for (const item of order.items) {
        const prod = item.product;
        const prevStock = prod.currentStock;
        const newStock = prevStock + item.quantity;

        await tx.product.update({
          where: { id: prod.id },
          data: { currentStock: newStock },
        });

        await tx.stockMovement.create({
          data: {
            productId: prod.id,
            type: "CANCEL_REVERSAL",
            quantity: item.quantity,
            previousStock: prevStock,
            newStock,
            referenceType: "ORDER",
            referenceId: order.id,
            notes: `Stock reversal on cancellation of Order #${order.orderNumber}`,
          },
        });
      }

      // 3. Audit log
      await tx.auditLog.create({
        data: {
          userId: user.userId,
          action: "DELETE",
          entity: "ORDER",
          entityId: order.id,
          details: JSON.stringify({
            orderNumber: order.orderNumber,
            cancelledItemsCount: order.items.length,
          }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Order #${order.orderNumber} cancelled and stock successfully restored.`,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    return NextResponse.json({ error: "Failed to cancel order" }, { status: 500 });
  }
}

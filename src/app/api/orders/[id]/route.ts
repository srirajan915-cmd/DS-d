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

    // Atomic stock restoration / reversal
    await prisma.$transaction(async (tx) => {
      // 1. Mark order cancelled
      await tx.order.update({
        where: { id },
        data: {
          isCancelled: true,
          cancelledAt: new Date(),
        },
      });

      const isTaken = order.orderType === "TAKEN_FROM_DS";

      // 2. Reverse stock for each line item
      for (const item of order.items) {
        const prod = item.product;
        const prevStock = prod.currentStock;
        // If it was taken from DS, stock was added IN, so cancelling means taking it OUT
        const newStock = isTaken ? Math.max(0, prevStock - item.quantity) : prevStock + item.quantity;

        await tx.product.update({
          where: { id: prod.id },
          data: { currentStock: newStock },
        });

        await tx.stockMovement.create({
          data: {
            productId: prod.id,
            type: isTaken ? "OUT" : "CANCEL_REVERSAL",
            quantity: item.quantity,
            previousStock: prevStock,
            newStock,
            referenceType: isTaken ? "TAKEN_FROM_DS" : "ORDER",
            referenceId: order.id,
            notes: isTaken
              ? `Reversal of Taken from DS voucher #${order.orderNumber}`
              : `Stock reversal on cancellation of Order #${order.orderNumber}`,
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
            orderType: order.orderType,
            cancelledItemsCount: order.items.length,
          }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Order #${order.orderNumber} cancelled and stock successfully adjusted.`,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    return NextResponse.json({ error: "Failed to cancel order" }, { status: 500 });
  }
}

// PATCH /api/orders/[id] - Update payment status / settlement (e.g. BALANCE <-> CLOSED)
export async function PATCH(
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
    const { paymentStatus } = body;

    if (!paymentStatus || !["PAID", "PARTIAL", "PENDING", "BALANCE", "CLOSED"].includes(paymentStatus)) {
      return NextResponse.json({ error: "Invalid payment status provided" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order || order.isDeleted) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const closedAt = paymentStatus === "CLOSED" ? new Date() : null;
    const amountPaid = paymentStatus === "CLOSED" || paymentStatus === "PAID" ? order.totalAmount : order.amountPaid;

    const updated = await prisma.order.update({
      where: { id },
      data: {
        paymentStatus,
        closedAt,
        amountPaid,
      },
      include: {
        customer: true,
        directSeller: true,
        items: { include: { product: true } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "UPDATE",
        entity: "ORDER",
        entityId: order.id,
        details: JSON.stringify({
          orderNumber: order.orderNumber,
          oldStatus: order.paymentStatus,
          newStatus: paymentStatus,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      order: updated,
      message: `Status updated to ${paymentStatus} successfully.`,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
  }
}

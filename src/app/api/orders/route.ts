import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const orderItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitRate: z.number().min(0, "Unit rate must be positive"),
});

const createOrderSchema = z.object({
  orderType: z.enum(["CUSTOMER", "DS", "TAKEN_FROM_DS"]),
  customerId: z.string().optional().nullable(),
  customerData: z
    .object({
      name: z.string().min(1, "Customer name is required"),
      phone: z.string().min(10, "Valid 10-digit phone number is required"),
      address: z.string().optional().nullable(),
      city: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  directSellerId: z.string().optional().nullable(),
  orderDate: z.string().optional().nullable(),
  rateType: z.enum(["MRP", "DP"]).default("MRP"),
  discount: z.number().min(0).default(0),
  paymentStatus: z.enum(["PAID", "PARTIAL", "PENDING", "BALANCE", "CLOSED"]).default("PAID"),
  amountPaid: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
  addStockToInventory: z.boolean().default(true),
  items: z.array(orderItemSchema).min(1, "At least one product line item is required"),
});

// GET /api/orders
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const orderType = searchParams.get("orderType") || "ALL"; // ALL | CUSTOMER | DS | TAKEN_FROM_DS
  const paymentStatus = searchParams.get("paymentStatus") || "ALL";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const where: any = { isDeleted: false };

  if (orderType !== "ALL") {
    where.orderType = orderType;
  }

  if (paymentStatus !== "ALL") {
    where.paymentStatus = paymentStatus;
  }

  if (startDate || endDate) {
    where.orderDate = {};
    if (startDate) where.orderDate.gte = new Date(startDate);
    if (endDate) {
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);
      where.orderDate.lte = eDate;
    }
  }

  if (search.trim()) {
    const term = search.trim();
    where.OR = [
      { orderNumber: { contains: term } },
      { customer: { name: { contains: term } } },
      { customer: { phone: { contains: term } } },
      { directSeller: { name: { contains: term } } },
      { directSeller: { dsCode: { contains: term } } },
      { directSeller: { phone: { contains: term } } },
    ];
  }

  try {
    // Total Metrics calculation
    const allOrders = await prisma.order.findMany({
      where: { isDeleted: false, isCancelled: false },
      select: { orderType: true, totalAmount: true, amountPaid: true, paymentStatus: true },
    });

    let totalRevenue = 0;
    let customerRevenue = 0;
    let dsRevenue = 0;
    let pendingReceivables = 0;
    let takenFromDsCount = 0;
    let takenFromDsBalanceCount = 0;
    let takenFromDsBalanceValue = 0;

    allOrders.forEach((o) => {
      if (o.orderType === "CUSTOMER") {
        totalRevenue += o.totalAmount;
        customerRevenue += o.totalAmount;
        if (o.paymentStatus !== "PAID") {
          pendingReceivables += Math.max(0, o.totalAmount - o.amountPaid);
        }
      } else if (o.orderType === "DS") {
        totalRevenue += o.totalAmount;
        dsRevenue += o.totalAmount;
        if (o.paymentStatus !== "PAID") {
          pendingReceivables += Math.max(0, o.totalAmount - o.amountPaid);
        }
      } else if (o.orderType === "TAKEN_FROM_DS") {
        takenFromDsCount++;
        if (o.paymentStatus === "BALANCE") {
          takenFromDsBalanceCount++;
          takenFromDsBalanceValue += o.totalAmount;
        }
      }
    });

    const [total, items] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { orderDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          customer: true,
          directSeller: true,
          items: {
            include: { product: true },
          },
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
      metrics: {
        totalRevenue,
        customerRevenue,
        dsRevenue,
        pendingReceivables,
        takenFromDsCount,
        takenFromDsBalanceCount,
        takenFromDsBalanceValue,
        orderCount: allOrders.length,
      },
    });
  } catch (error) {
    console.error("Fetch orders error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

// POST /api/orders
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = createOrderSchema.parse(body);

    let customerId = validated.customerId || null;
    let directSellerId = validated.directSellerId || null;

    // Handle Customer creation if details passed directly
    if (validated.orderType === "CUSTOMER") {
      if (!customerId && validated.customerData) {
        // Find existing customer by phone or create
        const existingCust = await prisma.customer.findFirst({
          where: { phone: validated.customerData.phone.trim(), isDeleted: false },
        });

        if (existingCust) {
          customerId = existingCust.id;
        } else {
          const newCust = await prisma.customer.create({
            data: {
              name: validated.customerData.name.trim(),
              phone: validated.customerData.phone.trim(),
              address: validated.customerData.address?.trim() || null,
              city: validated.customerData.city?.trim() || null,
            },
          });
          customerId = newCust.id;
        }
      }

      if (!customerId) {
        return NextResponse.json({ error: "Customer details are required for customer sales." }, { status: 400 });
      }
    } else if (validated.orderType === "DS" || validated.orderType === "TAKEN_FROM_DS") {
      if (!directSellerId) {
        return NextResponse.json(
          { error: "Direct Seller selection is required." },
          { status: 400 }
        );
      }
    }

    const isTakenFromDs = validated.orderType === "TAKEN_FROM_DS";

    // Atomic transaction for order creation, stock verification & deduction/addition
    const orderResult = await prisma.$transaction(async (tx) => {
      // 1. Verify products for each item
      const productIds = validated.items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, isDeleted: false },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      let subtotal = 0;
      const verifiedItems: {
        product: typeof products[0];
        quantity: number;
        unitRate: number;
        lineTotal: number;
      }[] = [];

      for (const item of validated.items) {
        const prod = productMap.get(item.productId);
        if (!prod) {
          throw new Error(`Product with ID '${item.productId}' not found or inactive.`);
        }

        // For regular sales, verify current stock
        if (!isTakenFromDs && prod.currentStock < item.quantity) {
          throw new Error(
            `Insufficient stock for '${prod.name}'. Requested ${item.quantity}, but only ${prod.currentStock} units available.`
          );
        }

        const lineTotal = item.quantity * item.unitRate;
        subtotal += lineTotal;

        verifiedItems.push({
          product: prod,
          quantity: item.quantity,
          unitRate: item.unitRate,
          lineTotal,
        });
      }

      const discount = validated.discount || 0;
      const totalAmount = Math.max(0, subtotal - discount);

      let amountPaid = validated.amountPaid;
      if (isTakenFromDs) {
        amountPaid = validated.paymentStatus === "CLOSED" ? totalAmount : 0;
      } else if (validated.paymentStatus === "PAID") {
        amountPaid = totalAmount;
      } else if (validated.paymentStatus === "PENDING" || validated.paymentStatus === "BALANCE") {
        amountPaid = 0;
      }

      // 2. Generate unique order number (TK- for taken, ORD- for sales)
      const countToday = await tx.order.count();
      const orderNumber = isTakenFromDs
        ? `TK-${new Date().getFullYear()}-${String(countToday + 1).padStart(4, "0")}`
        : `ORD-${new Date().getFullYear()}-${String(countToday + 1).padStart(4, "0")}`;

      // 3. Create Order
      const orderDate = validated.orderDate ? new Date(validated.orderDate) : new Date();
      const closedAt = isTakenFromDs && validated.paymentStatus === "CLOSED" ? new Date() : null;

      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          orderDate,
          orderType: validated.orderType,
          customerId,
          directSellerId,
          rateType: validated.rateType,
          subtotal,
          discount,
          totalAmount,
          paymentStatus: validated.paymentStatus,
          amountPaid,
          closedAt,
          notes: validated.notes || null,
        },
      });

      // 4. Create OrderItems & Adjust Stock with Movements
      for (const vItem of verifiedItems) {
        await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            productId: vItem.product.id,
            quantity: vItem.quantity,
            unitRate: vItem.unitRate,
            lineTotal: vItem.lineTotal,
          },
        });

        if (isTakenFromDs) {
          // If Taken from DS and user opted to add to inventory
          if (validated.addStockToInventory) {
            const prevStock = vItem.product.currentStock;
            const newStock = prevStock + vItem.quantity;

            await tx.product.update({
              where: { id: vItem.product.id },
              data: { currentStock: newStock },
            });

            await tx.stockMovement.create({
              data: {
                productId: vItem.product.id,
                type: "IN",
                quantity: vItem.quantity,
                previousStock: prevStock,
                newStock,
                referenceType: "TAKEN_FROM_DS",
                referenceId: createdOrder.id,
                notes: `Received/Taken from Direct Seller (Voucher #${orderNumber})`,
              },
            });
          }
        } else {
          // Regular Sale: Deduct product stock
          const prevStock = vItem.product.currentStock;
          const newStock = prevStock - vItem.quantity;

          await tx.product.update({
            where: { id: vItem.product.id },
            data: { currentStock: newStock },
          });

          // Log stock movement
          await tx.stockMovement.create({
            data: {
              productId: vItem.product.id,
              type: "SALE",
              quantity: vItem.quantity,
              previousStock: prevStock,
              newStock,
              referenceType: "ORDER",
              referenceId: createdOrder.id,
              notes: `Sale Order #${orderNumber} (${validated.orderType})`,
            },
          });
        }
      }

      // 5. Audit log
      await tx.auditLog.create({
        data: {
          userId: user.userId,
          action: "CREATE",
          entity: "ORDER",
          entityId: createdOrder.id,
          details: JSON.stringify({
            orderNumber,
            totalAmount,
            orderType: validated.orderType,
            itemsCount: verifiedItems.length,
            status: validated.paymentStatus,
          }),
        },
      });

      return createdOrder;
    });

    // Fetch full order with relations to return
    const fullOrder = await prisma.order.findUnique({
      where: { id: orderResult.id },
      include: {
        customer: true,
        directSeller: true,
        items: { include: { product: true } },
      },
    });

    return NextResponse.json({ success: true, order: fullOrder });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Create order error:", error);
    return NextResponse.json({ error: error.message || "Failed to create order" }, { status: 400 });
  }
}

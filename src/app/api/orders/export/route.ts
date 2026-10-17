import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import * as XLSX from "xlsx";
import { formatDateIST } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const orderType = searchParams.get("orderType");

  const where: any = { isDeleted: false };
  if (orderType && orderType !== "ALL") {
    where.orderType = orderType;
  }

  try {
    const orders = await prisma.order.findMany({
      where,
      orderBy: { orderDate: "desc" },
      include: {
        customer: true,
        directSeller: true,
        items: { include: { product: true } },
      },
    });

    const rows = orders.map((o, index) => {
      const recipientName =
        o.orderType === "CUSTOMER" ? o.customer?.name : `${o.directSeller?.name} (${o.directSeller?.dsCode})`;
      const recipientPhone =
        o.orderType === "CUSTOMER" ? o.customer?.phone : o.directSeller?.phone;

      const itemsSummary = o.items
        .map((i) => `${i.product.name} (Qty: ${i.quantity} @ ₹${i.unitRate})`)
        .join("; ");

      const balanceDue = Math.max(0, o.totalAmount - o.amountPaid);

      return {
        "S.No": index + 1,
        "Order Number": o.orderNumber,
        "Date": formatDateIST(o.orderDate),
        "Order Type": o.orderType,
        "Recipient Name": recipientName || "-",
        "Phone": recipientPhone || "-",
        "Rate Applied": o.rateType,
        "Subtotal (₹)": o.subtotal,
        "Discount (₹)": o.discount,
        "Total Amount (₹)": o.totalAmount,
        "Payment Status": o.paymentStatus,
        "Amount Paid (₹)": o.amountPaid,
        "Balance Due (₹)": balanceDue,
        "Cancelled": o.isCancelled ? "YES" : "NO",
        "Products Purchased": itemsSummary,
        "Notes": o.notes || "-",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Register");

    worksheet["!cols"] = [
      { wch: 6 },  // S.No
      { wch: 16 }, // Order #
      { wch: 14 }, // Date
      { wch: 12 }, // Type
      { wch: 24 }, // Name
      { wch: 15 }, // Phone
      { wch: 12 }, // Rate
      { wch: 12 }, // Subtotal
      { wch: 12 }, // Discount
      { wch: 14 }, // Total
      { wch: 14 }, // Payment
      { wch: 14 }, // Paid
      { wch: 14 }, // Due
      { wch: 10 }, // Cancelled
      { wch: 40 }, // Products
      { wch: 25 }, // Notes
    ];

    const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="Sales_Register_${orderType || "ALL"}_${new Date().toISOString().slice(0, 10)}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    console.error("Export orders error:", error);
    return NextResponse.json({ error: "Failed to generate sales export" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import * as XLSX from "xlsx";
import { formatDateIST, formatDateTimeIST } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const products = await prisma.product.findMany({
      where: { isDeleted: false },
      orderBy: { name: "asc" },
    });

    const movements = await prisma.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { product: true },
    });

    // Sheet 1: Inventory
    const inventoryRows = products.map((p, index) => {
      const margin = p.mrp > 0 ? (((p.mrp - p.dp) / p.mrp) * 100).toFixed(1) + "%" : "0%";
      let status = "IN STOCK";
      if (p.currentStock <= 0) status = "OUT OF STOCK";
      else if (p.currentStock <= p.reorderLevel) status = "LOW STOCK";

      return {
        "S.No": index + 1,
        "SKU": p.sku,
        "Product Name": p.name,
        "MRP (₹)": p.mrp,
        "DP (₹)": p.dp,
        "Margin (%)": margin,
        "Current Stock": p.currentStock,
        "Reorder Level": p.reorderLevel,
        "Status": status,
        "Total DP Value (₹)": p.currentStock * p.dp,
        "Total MRP Value (₹)": p.currentStock * p.mrp,
        "Batch No": p.batchNumber || "-",
        "Expiry Date": p.expiryDate ? formatDateIST(p.expiryDate) : "-",
      };
    });

    // Sheet 2: Movements
    const movementRows = movements.map((m, index) => ({
      "S.No": index + 1,
      "Date & Time": formatDateTimeIST(m.createdAt),
      "SKU": m.product?.sku || "-",
      "Product Name": m.product?.name || "-",
      "Movement Type": m.type,
      "Quantity": m.quantity,
      "Previous Stock": m.previousStock,
      "New Stock": m.newStock,
      "Reference": m.referenceType,
      "Notes": m.notes || "-",
    }));

    const workbook = XLSX.utils.book_new();

    const wsInventory = XLSX.utils.json_to_sheet(inventoryRows);
    wsInventory["!cols"] = [
      { wch: 6 },  // S.No
      { wch: 14 }, // SKU
      { wch: 32 }, // Name
      { wch: 10 }, // MRP
      { wch: 10 }, // DP
      { wch: 12 }, // Margin
      { wch: 14 }, // Current Stock
      { wch: 14 }, // Reorder Level
      { wch: 14 }, // Status
      { wch: 18 }, // Total DP
      { wch: 18 }, // Total MRP
      { wch: 12 }, // Batch
      { wch: 14 }, // Expiry
    ];
    XLSX.utils.book_append_sheet(workbook, wsInventory, "Current Inventory");

    const wsMovements = XLSX.utils.json_to_sheet(movementRows);
    wsMovements["!cols"] = [
      { wch: 6 },  // S.No
      { wch: 20 }, // Date
      { wch: 14 }, // SKU
      { wch: 30 }, // Product
      { wch: 15 }, // Type
      { wch: 10 }, // Quantity
      { wch: 14 }, // Prev
      { wch: 14 }, // New
      { wch: 14 }, // Ref
      { wch: 35 }, // Notes
    ];
    XLSX.utils.book_append_sheet(workbook, wsMovements, "Stock Movements");

    const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="Stock_Inventory_Report_${new Date().toISOString().slice(0, 10)}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    console.error("Export stock error:", error);
    return NextResponse.json({ error: "Failed to generate stock export" }, { status: 500 });
  }
}

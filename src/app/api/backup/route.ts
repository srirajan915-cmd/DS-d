import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import * as XLSX from "xlsx";
import { formatDateIST } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "summary";

  try {
    // 1. Fetch all business entities
    const [
      directSellers,
      products,
      customers,
      orders,
      followUps,
      templates,
      stockMovements,
    ] = await Promise.all([
      prisma.directSeller.findMany({
        where: { isDeleted: false },
        orderBy: { dsCode: "asc" },
      }),
      prisma.product.findMany({
        where: { isDeleted: false },
        orderBy: { name: "asc" },
      }),
      prisma.customer.findMany({
        where: { isDeleted: false },
        orderBy: { name: "asc" },
      }),
      prisma.order.findMany({
        where: { isDeleted: false },
        include: {
          customer: true,
          directSeller: true,
          items: { include: { product: true } },
        },
        orderBy: { orderDate: "desc" },
      }),
      prisma.followUp.findMany({
        where: { isDeleted: false },
        include: {
          customer: true,
          directSeller: true,
          product: true,
        },
        orderBy: { followUpDate: "desc" },
      }),
      prisma.messageTemplate.findMany({
        orderBy: { name: "asc" },
      }),
      prisma.stockMovement.findMany({
        include: { product: { select: { sku: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);

    // Map upline names and downline counts for Direct Sellers
    const dsCodeMap = new Map(directSellers.map((ds) => [ds.dsCode, ds]));
    const downlineCountMap = new Map<string, number>();
    directSellers.forEach((ds) => {
      if (ds.uplineCode) {
        downlineCountMap.set(ds.uplineCode, (downlineCountMap.get(ds.uplineCode) || 0) + 1);
      }
    });

    // Handle Summary format for /reports dashboard
    if (format === "summary") {
      let lifetimeRevenue = 0;
      let totalCost = 0;
      let totalReceivables = 0;
      let customerOrdersCount = 0;
      let dsOrdersCount = 0;

      orders.forEach((o) => {
        if (!o.isCancelled) {
          lifetimeRevenue += o.totalAmount;
          if (o.orderType === "CUSTOMER") customerOrdersCount++;
          else dsOrdersCount++;

          if (o.paymentStatus !== "PAID") {
            totalReceivables += Math.max(0, o.totalAmount - o.amountPaid);
          }

          o.items.forEach((item) => {
            totalCost += item.quantity * item.product.dp;
          });
        }
      });

      const grossProfit = Math.max(0, lifetimeRevenue - totalCost);

      // Inventory valuation
      let totalStockUnits = 0;
      let stockDpValuation = 0;
      let stockMrpValuation = 0;
      products.forEach((p) => {
        if (p.currentStock > 0) {
          totalStockUnits += p.currentStock;
          stockDpValuation += p.currentStock * p.dp;
          stockMrpValuation += p.currentStock * p.mrp;
        }
      });

      // DS Performance leaderboard
      const dsPerformanceMap = new Map<string, {
        id: string;
        name: string;
        dsCode: string;
        category: string;
        phone: string;
        totalOrders: number;
        totalVolume: number;
        downlinesCount: number;
      }>();

      directSellers.forEach((ds) => {
        dsPerformanceMap.set(ds.id, {
          id: ds.id,
          name: ds.name,
          dsCode: ds.dsCode,
          category: ds.category,
          phone: ds.phone,
          totalOrders: 0,
          totalVolume: 0,
          downlinesCount: downlineCountMap.get(ds.dsCode) || 0,
        });
      });

      orders.forEach((o) => {
        if (o.orderType === "DS" && o.directSellerId && !o.isCancelled) {
          const stat = dsPerformanceMap.get(o.directSellerId);
          if (stat) {
            stat.totalOrders += 1;
            stat.totalVolume += o.totalAmount;
          }
        }
      });

      const dsLeaderboard = Array.from(dsPerformanceMap.values())
        .sort((a, b) => b.totalVolume - a.totalVolume);

      return NextResponse.json({
        financials: {
          lifetimeRevenue,
          grossProfit,
          totalReceivables,
          totalOrders: orders.filter((o) => !o.isCancelled).length,
          customerOrdersCount,
          dsOrdersCount,
        },
        inventoryValuation: {
          totalStockUnits,
          stockDpValuation,
          stockMrpValuation,
          potentialProfit: Math.max(0, stockMrpValuation - stockDpValuation),
        },
        dsLeaderboard,
        counts: {
          directSellers: directSellers.length,
          products: products.length,
          customers: customers.length,
          orders: orders.length,
          followUps: followUps.length,
        },
      });
    }

    // Handle full JSON backup export
    if (format === "json") {
      const backupData = {
        version: "1.0",
        exportTimestamp: new Date().toISOString(),
        businessName: "DirectSell Pro",
        directSellers: directSellers.map((ds) => ({
          ...ds,
          uplineName: ds.uplineCode ? dsCodeMap.get(ds.uplineCode)?.name : undefined,
          downlineCount: downlineCountMap.get(ds.dsCode) || 0,
        })),
        products,
        customers,
        orders: orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          orderType: o.orderType,
          orderDate: o.orderDate,
          customerName: o.customer?.name,
          dsName: o.directSeller?.name,
          dsCode: o.directSeller?.dsCode,
          rateType: o.rateType,
          subtotal: o.subtotal,
          discount: o.discount,
          totalAmount: o.totalAmount,
          paymentStatus: o.paymentStatus,
          amountPaid: o.amountPaid,
          isCancelled: o.isCancelled,
          items: o.items.map((it) => ({
            productName: it.product.name,
            sku: it.product.sku,
            unitRate: it.unitRate,
            quantity: it.quantity,
            lineTotal: it.lineTotal,
          })),
        })),
        followUps: followUps.map((f) => ({
          id: f.id,
          type: f.type,
          personType: f.personType,
          targetName: f.directSeller?.name || f.customer?.name || "Unknown",
          targetPhone: f.directSeller?.phone || f.customer?.phone || "",
          productName: f.product?.name,
          followUpDate: f.followUpDate,
          status: f.status,
          notes: f.notes,
        })),
        messageTemplates: templates,
        stockMovements: stockMovements.map((m) => ({
          sku: m.product.sku,
          productName: m.product.name,
          type: m.type,
          quantity: m.quantity,
          previousStock: m.previousStock,
          newStock: m.newStock,
          referenceType: m.referenceType,
          referenceId: m.referenceId,
          notes: m.notes,
          createdAt: m.createdAt,
        })),
      };

      const dateStr = new Date().toISOString().split("T")[0];
      return new Response(JSON.stringify(backupData, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="directsell_backup_${dateStr}.json"`,
        },
      });
    }

    // Handle full multi-sheet XLSX export
    if (format === "xlsx") {
      const workbook = XLSX.utils.book_new();

      // Sheet 1: Direct Sellers
      const dsRows = directSellers.map((ds) => ({
        "DS Code": ds.dsCode,
        "Name": ds.name,
        "Category": ds.category,
        "Phone": ds.phone,
        "City": ds.city || "",
        "Address": ds.address || "",
        "Upline Code": ds.uplineCode || "",
        "Upline Name": ds.uplineCode ? dsCodeMap.get(ds.uplineCode)?.name || "" : "",
        "Downline Count": downlineCountMap.get(ds.dsCode) || 0,
        "Joining Date": formatDateIST(ds.joiningDate),
        "Status": ds.status,
        "Notes": ds.notes || "",
      }));
      const dsSheet = XLSX.utils.json_to_sheet(dsRows);
      XLSX.utils.book_append_sheet(workbook, dsSheet, "Direct Sellers");

      // Sheet 2: Products & Inventory
      const prodRows = products.map((p) => ({
        "SKU": p.sku,
        "Product Name": p.name,
        "Category": p.category || "WELLNESS",
        "MRP (₹)": p.mrp,
        "DP (₹)": p.dp,
        "Retail Margin (₹)": p.mrp - p.dp,
        "Margin (%)": Number((((p.mrp - p.dp) / p.mrp) * 100).toFixed(1)),
        "Current Stock": p.currentStock,
        "Reorder Level": p.reorderLevel,
        "Stock Valuation DP (₹)": p.currentStock * p.dp,
        "Stock Valuation MRP (₹)": p.currentStock * p.mrp,
        "Batch #": p.batchNumber || "",
        "Expiry Date": p.expiryDate ? formatDateIST(p.expiryDate) : "",
      }));
      const prodSheet = XLSX.utils.json_to_sheet(prodRows);
      XLSX.utils.book_append_sheet(workbook, prodSheet, "Inventory");

      // Sheet 3: Orders & Sales
      const orderRows = orders.map((o) => ({
        "Order #": o.orderNumber,
        "Date": formatDateIST(o.orderDate),
        "Type": o.orderType,
        "Rate Applied": o.rateType,
        "Buyer Name": o.directSeller?.name || o.customer?.name || "Unknown",
        "Buyer Code": o.directSeller?.dsCode || "",
        "Subtotal (₹)": o.subtotal,
        "Discount (₹)": o.discount,
        "Total (₹)": o.totalAmount,
        "Amount Paid (₹)": o.amountPaid,
        "Balance Due (₹)": Math.max(0, o.totalAmount - o.amountPaid),
        "Payment Status": o.paymentStatus,
        "Cancelled": o.isCancelled ? "YES" : "NO",
      }));
      const orderSheet = XLSX.utils.json_to_sheet(orderRows);
      XLSX.utils.book_append_sheet(workbook, orderSheet, "Orders");

      // Sheet 4: Retail Customers
      const custRows = customers.map((c) => ({
        "Customer Name": c.name,
        "Phone": c.phone,
        "Address": c.address || "",
        "City": c.city || "",
        "Notes": c.notes || "",
        "Created Date": formatDateIST(c.createdAt),
      }));
      const custSheet = XLSX.utils.json_to_sheet(custRows);
      XLSX.utils.book_append_sheet(workbook, custSheet, "Customers");

      // Sheet 5: Follow-ups
      const fuRows = followUps.map((f) => ({
        "Target Name": f.directSeller?.name || f.customer?.name || "Unknown",
        "Phone": f.directSeller?.phone || f.customer?.phone || "",
        "Type": f.type,
        "Person Type": f.personType,
        "Product": f.product?.name || "",
        "Scheduled Date": formatDateIST(f.followUpDate),
        "Status": f.status,
        "Notes": f.notes || "",
      }));
      const fuSheet = XLSX.utils.json_to_sheet(fuRows);
      XLSX.utils.book_append_sheet(workbook, fuSheet, "Follow-ups");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      const dateStr = new Date().toISOString().split("T")[0];

      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="DirectSell_Master_${dateStr}.xlsx"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid format requested" }, { status: 400 });
  } catch (error) {
    console.error("Backup export error:", error);
    return NextResponse.json({ error: "Failed to generate backup export" }, { status: 500 });
  }
}

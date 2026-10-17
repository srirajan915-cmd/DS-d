import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

interface StockImportRow {
  sku?: string;
  name?: string;
  category?: string;
  Category?: string;
  mrp?: number | string;
  dp?: number | string;
  quantity?: number | string;
  reorderLevel?: number | string;
  batchNumber?: string;
  expiryDate?: string;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { rows, mode = "ADD" } = (await request.json()) as {
      rows: StockImportRow[];
      mode?: "ADD" | "SET";
    };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No inventory rows provided for upload." }, { status: 400 });
    }

    const errors: { row: number; sku?: string; error: string }[] = [];
    let updatedCount = 0;
    let insertedCount = 0;

    // Fetch existing products
    const existingProducts = await prisma.product.findMany({
      where: { isDeleted: false },
    });
    const productBySku = new Map<string, typeof existingProducts[0]>();
    existingProducts.forEach((p) => productBySku.set(p.sku.toUpperCase(), p));

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 2;

      const sku = r.sku?.toString().trim().toUpperCase();
      const name = r.name?.toString().trim();
      const category = r.category?.toString().trim() || r.Category?.toString().trim();
      const mrp = parseFloat(String(r.mrp || 0));
      const dp = parseFloat(String(r.dp || 0));
      const qty = parseInt(String(r.quantity || 0), 10);
      const reorderLevel = r.reorderLevel ? parseInt(String(r.reorderLevel), 10) : 5;
      const batchNumber = r.batchNumber?.toString().trim() || null;
      const expiryDate = r.expiryDate ? new Date(r.expiryDate) : null;

      if (!sku) {
        errors.push({ row: rowNum, error: "Product SKU is missing." });
        continue;
      }

      if (isNaN(qty) || qty < 0) {
        errors.push({ row: rowNum, sku, error: "Invalid stock quantity (must be >= 0)." });
        continue;
      }

      const existing = productBySku.get(sku);

      if (existing) {
        // UPDATE EXISTING PRODUCT
        const prevStock = existing.currentStock;
        const newStock = mode === "ADD" ? prevStock + qty : qty;
        const movementQty = Math.abs(newStock - prevStock);

        await prisma.$transaction(async (tx) => {
          await tx.product.update({
            where: { id: existing.id },
            data: {
              currentStock: newStock,
              mrp: mrp > 0 ? mrp : existing.mrp,
              dp: dp > 0 ? dp : existing.dp,
              name: name || existing.name,
              category: category || existing.category,
              reorderLevel: reorderLevel > 0 ? reorderLevel : existing.reorderLevel,
              batchNumber: batchNumber || existing.batchNumber,
              expiryDate: expiryDate || existing.expiryDate,
            },
          });

          if (movementQty > 0) {
            await tx.stockMovement.create({
              data: {
                productId: existing.id,
                type: mode === "ADD" ? "IN" : "ADJUSTMENT",
                quantity: movementQty,
                previousStock: prevStock,
                newStock,
                referenceType: "UPLOAD",
                notes: `Bulk Excel inventory upload (${mode === "ADD" ? "Stock Added" : "Stock Count Adjusted"})`,
              },
            });
          }
        });

        updatedCount++;
      } else {
        // INSERT NEW PRODUCT
        if (!name) {
          errors.push({ row: rowNum, sku, error: "Product Name is required for new SKU." });
          continue;
        }

        if (mrp <= 0 || dp <= 0) {
          errors.push({ row: rowNum, sku, error: "Valid MRP and DP are required for new SKU." });
          continue;
        }

        await prisma.$transaction(async (tx) => {
          const created = await tx.product.create({
            data: {
              sku,
              name,
              category: category || "WELLNESS",
              mrp,
              dp,
              currentStock: qty,
              reorderLevel,
              batchNumber,
              expiryDate,
            },
          });

          if (qty > 0) {
            await tx.stockMovement.create({
              data: {
                productId: created.id,
                type: "IN",
                quantity: qty,
                previousStock: 0,
                newStock: qty,
                referenceType: "UPLOAD",
                notes: "Initial inventory setup via Excel import",
              },
            });
          }
        });

        insertedCount++;
      }
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "IMPORT",
        entity: "PRODUCT",
        details: JSON.stringify({ updatedCount, insertedCount, errorCount: errors.length }),
      },
    });

    return NextResponse.json({
      success: true,
      updatedCount,
      insertedCount,
      totalProcessed: updatedCount + insertedCount,
      errorCount: errors.length,
      errors,
    });
  } catch (error) {
    console.error("Stock import error:", error);
    return NextResponse.json({ error: "Failed to process stock upload" }, { status: 500 });
  }
}

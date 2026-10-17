import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

interface ImportRow {
  dsCode?: string;
  name?: string;
  phone?: string;
  category?: string;
  city?: string;
  address?: string;
  uplineCode?: string;
  status?: string;
  notes?: string;
  joiningDate?: string;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { rows } = (await request.json()) as { rows: ImportRow[] };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No data rows provided for import." }, { status: 400 });
    }

    const errors: { row: number; dsCode?: string; error: string }[] = [];
    const validRows: any[] = [];
    const seenCodesInBatch = new Set<string>();

    // Fetch existing active DS codes from database
    const existingActiveDS = await prisma.directSeller.findMany({
      where: { isDeleted: false },
      select: { dsCode: true },
    });
    const existingDbCodes = new Set(existingActiveDS.map((d) => d.dsCode.toUpperCase()));

    rows.forEach((r, idx) => {
      const rowNum = idx + 2; // Accounting for 1-based index + header row

      const dsCode = r.dsCode?.toString().trim().toUpperCase();
      const name = r.name?.toString().trim();
      const phone = r.phone?.toString().trim().replace(/\D/g, "");
      let category = r.category?.toString().trim().toUpperCase();
      const city = r.city?.toString().trim() || null;
      const address = r.address?.toString().trim() || null;
      const uplineCode = r.uplineCode?.toString().trim().toUpperCase() || null;
      let status = r.status?.toString().trim().toUpperCase() || "ACTIVE";
      const notes = r.notes?.toString().trim() || null;

      // Validations
      if (!dsCode) {
        errors.push({ row: rowNum, error: "DS Code is missing." });
        return;
      }

      if (!name) {
        errors.push({ row: rowNum, dsCode, error: "Name is missing." });
        return;
      }

      if (!phone || phone.length < 10) {
        errors.push({ row: rowNum, dsCode, error: "Invalid phone number (minimum 10 digits required)." });
        return;
      }

      // Default category if vague
      if (category !== "SAO" && category !== "SGO") {
        category = "SAO";
      }

      if (status !== "ACTIVE" && status !== "INACTIVE") {
        status = "ACTIVE";
      }

      // Check duplicates within batch
      if (seenCodesInBatch.has(dsCode)) {
        errors.push({ row: rowNum, dsCode, error: `Duplicate DS Code '${dsCode}' found multiple times in upload file.` });
        return;
      }
      seenCodesInBatch.add(dsCode);

      // Check duplicate in database
      if (existingDbCodes.has(dsCode)) {
        errors.push({ row: rowNum, dsCode, error: `DS Code '${dsCode}' is already registered in the system.` });
        return;
      }

      validRows.push({
        dsCode,
        name,
        phone,
        category,
        city,
        address,
        uplineCode,
        status,
        notes,
        joiningDate: r.joiningDate ? new Date(r.joiningDate) : new Date(),
      });
    });

    // If there are valid rows, insert them in transaction
    let createdCount = 0;
    if (validRows.length > 0) {
      await prisma.$transaction(
        validRows.map((row) =>
          prisma.directSeller.create({
            data: row,
          })
        )
      );
      createdCount = validRows.length;

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "IMPORT",
          entity: "DS",
          details: JSON.stringify({ count: createdCount, errorsCount: errors.length }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      successCount: createdCount,
      errorCount: errors.length,
      errors,
    });
  } catch (error) {
    console.error("Import DS error:", error);
    return NextResponse.json({ error: "Failed to process Excel import" }, { status: 500 });
  }
}

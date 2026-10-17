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
  const category = searchParams.get("category");

  const where: any = { isDeleted: false };
  if (category && category !== "ALL") {
    where.category = category;
  }

  try {
    const list = await prisma.directSeller.findMany({
      where,
      orderBy: { dsCode: "asc" },
    });

    const rows = list.map((item, index) => ({
      "S.No": index + 1,
      "DS Code": item.dsCode,
      "Name": item.name,
      "Phone Number": item.phone,
      "Category": item.category,
      "City": item.city || "-",
      "Address": item.address || "-",
      "Upline Code": item.uplineCode || "-",
      "Joining Date": formatDateIST(item.joiningDate),
      "Status": item.status,
      "Notes": item.notes || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Direct Sellers");

    // Auto-fit column widths
    worksheet["!cols"] = [
      { wch: 6 },  // S.No
      { wch: 12 }, // DS Code
      { wch: 22 }, // Name
      { wch: 15 }, // Phone
      { wch: 10 }, // Category
      { wch: 15 }, // City
      { wch: 30 }, // Address
      { wch: 12 }, // Upline
      { wch: 14 }, // Date
      { wch: 10 }, // Status
      { wch: 30 }, // Notes
    ];

    const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="Direct_Sellers_${category || "ALL"}_${new Date().toISOString().slice(0, 10)}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    console.error("Export DS error:", error);
    return NextResponse.json({ error: "Failed to generate Excel export" }, { status: 500 });
  }
}

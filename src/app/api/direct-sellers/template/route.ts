import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const sampleData = [
    {
      "DS Code": "DS3001",
      "Name": "Anand Varma",
      "Phone Number": "9876541122",
      "Category": "SAO",
      "City": "Hyderabad",
      "Address": "Plot 12, Jubilee Hills",
      "Upline Code": "DS1001",
      "Status": "ACTIVE",
      "Notes": "Experienced direct seller in wellness segment",
    },
    {
      "DS Code": "DS3002",
      "Name": "Meena Kumari",
      "Phone Number": "9876542233",
      "Category": "SGO",
      "City": "Chennai",
      "Address": "45, T Nagar",
      "Upline Code": "DS1002",
      "Status": "ACTIVE",
      "Notes": "Joined through community health camp",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "DS Template");

  worksheet["!cols"] = [
    { wch: 12 }, // DS Code
    { wch: 20 }, // Name
    { wch: 16 }, // Phone Number
    { wch: 10 }, // Category
    { wch: 15 }, // City
    { wch: 30 }, // Address
    { wch: 12 }, // Upline Code
    { wch: 10 }, // Status
    { wch: 35 }, // Notes
  ];

  const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Disposition": 'attachment; filename="Direct_Seller_Import_Template.xlsx"',
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}

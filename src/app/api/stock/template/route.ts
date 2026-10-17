import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const sampleData = [
    {
      "SKU": "HL-ALOE-1L",
      "Product Name": "Aloe Vera Health Juice 1L",
      "Category": "WELLNESS",
      "MRP": 550,
      "DP": 440,
      "Quantity": 50,
      "Reorder Level": 10,
      "Batch Number": "B2607",
      "Expiry Date": "2028-12-31",
    },
    {
      "SKU": "SC-BBC-50",
      "Product Name": "Sniss Daily Radiance BB Cream 50g",
      "Category": "SNISS COSMETIC",
      "MRP": 450,
      "DP": 340,
      "Quantity": 30,
      "Reorder Level": 12,
      "Batch Number": "B2608",
      "Expiry Date": "2027-11-30",
    },
    {
      "SKU": "AG-BIO-1L",
      "Product Name": "Organic Bio-Crop Soil Enhancer 1L",
      "Category": "AGRICULTURE",
      "MRP": 850,
      "DP": 620,
      "Quantity": 25,
      "Reorder Level": 8,
      "Batch Number": "AG2601",
      "Expiry Date": "2028-06-30",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Template");

  worksheet["!cols"] = [
    { wch: 15 }, // SKU
    { wch: 34 }, // Product Name
    { wch: 18 }, // Category
    { wch: 10 }, // MRP
    { wch: 10 }, // DP
    { wch: 12 }, // Quantity
    { wch: 14 }, // Reorder Level
    { wch: 14 }, // Batch Number
    { wch: 14 }, // Expiry Date
  ];

  const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Disposition": 'attachment; filename="Product_Stock_Import_Template.xlsx"',
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}

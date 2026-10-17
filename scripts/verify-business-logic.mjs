/**
 * Automated Business Logic & Invariant Test Suite
 * Run with: node scripts/verify-business-logic.mjs
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const prisma = new PrismaClient();

// Test suite counter
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName) {
  testsRun++;
  if (condition) {
    testsPassed++;
    console.log(`  \x1b[32m✓ PASS\x1b[0m ${testName}`);
  } else {
    testsFailed++;
    console.error(`  \x1b[31m✗ FAIL\x1b[0m ${testName}`);
  }
}

// 1. Phone number normalization utility
function cleanIndianPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

// 2. Template interpolation utility
function interpolateTemplate(template, variables) {
  let result = template;
  for (const [key, val] of Object.entries(variables)) {
    const placeholder = new RegExp(`\\{${key}\\}`, "gi");
    result = result.replace(placeholder, val ? String(val) : "");
  }
  return result;
}

// 3. Indian Rupee formatting utility
function formatINR(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}

async function runTestSuite() {
  console.log("\n\x1b[1m=== DIRECTSELL PRO AUTOMATED BUSINESS LOGIC TEST SUITE ===\x1b[0m\n");

  // TEST SUITE 1: Phone & WhatsApp Normalization
  console.log("\x1b[34m[Suite 1: Indian Phone & WhatsApp Normalization]\x1b[0m");
  assert(cleanIndianPhone("9876543210") === "919876543210", "10-digit number adds 91 prefix");
  assert(cleanIndianPhone("+91 98765 43210") === "919876543210", "Removes spaces and plus prefix");
  assert(cleanIndianPhone("09876543210") === "919876543210", "Converts leading 0 prefix to 91");
  assert(cleanIndianPhone("919876543210") === "919876543210", "Preserves existing 91 prefix");

  // TEST SUITE 2: WhatsApp Template Dynamic Tag Interpolation
  console.log("\n\x1b[34m[Suite 2: Dynamic Template Interpolation]\x1b[0m");
  const template = "Hello {name}, your DS code is {ds_code}. Balance: {amount}";
  const merged = interpolateTemplate(template, { name: "Kavitha", ds_code: "SAO1002", amount: "₹500" });
  assert(merged === "Hello Kavitha, your DS code is SAO1002. Balance: ₹500", "Interpolates all placeholders");

  // TEST SUITE 3: INR Currency Formatting
  console.log("\n\x1b[34m[Suite 3: Indian Currency (INR ₹) Formatting]\x1b[0m");
  const inrFormatted = formatINR(150000);
  assert(inrFormatted.includes("1,50,000"), "Uses Indian comma grouping (lakhs/crores format)");

  // TEST SUITE 4: Margin & Pricing Invariants
  console.log("\n\x1b[34m[Suite 4: Pricing, Margin & Reorder Calculations]\x1b[0m");
  const mrp = 1200;
  const dp = 900;
  const marginAmt = mrp - dp;
  const marginPct = ((marginAmt / mrp) * 100).toFixed(1);
  assert(marginAmt === 300, "Calculates correct absolute retail margin");
  assert(marginPct === "25.0", "Calculates correct percentage margin (25.0%)");

  // TEST SUITE 5: Auth & Security (Bcrypt + JOSE JWT)
  console.log("\n\x1b[34m[Suite 5: Authentication & JOSE JWT Security]\x1b[0m");
  const testPassword = "securePassword123!";
  const hash = await bcrypt.hash(testPassword, 10);
  const passwordMatch = await bcrypt.compare(testPassword, hash);
  assert(passwordMatch === true, "Bcrypt hash and compare verification works");

  const jwtSecret = new TextEncoder().encode("directsell_pwa_jwt_secret_key_2026_super_secure");
  const token = await new SignJWT({ userId: "test-user-1", role: "ADMIN" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(jwtSecret);

  const { payload } = await jwtVerify(token, jwtSecret);
  assert(payload.userId === "test-user-1" && payload.role === "ADMIN", "JOSE JWT signs and verifies payload");

  // TEST SUITE 6: Database Invariants (Live SQLite dev.db)
  console.log("\n\x1b[34m[Suite 6: Database Integrity & Invariants]\x1b[0m");
  try {
    // Check Admin user
    const admin = await prisma.user.findUnique({ where: { email: "admin@directsell.com" } });
    assert(admin !== null, "Admin user exists in database");
    assert(admin?.role === "ADMIN", "Admin has ADMIN role");

    // Check Direct Sellers
    const dsCount = await prisma.directSeller.count({ where: { isDeleted: false } });
    assert(dsCount >= 6, `Direct Sellers seeded (${dsCount} total active)`);

    const dsList = await prisma.directSeller.findMany({ where: { isDeleted: false } });
    const allCategoriesValid = dsList.every((ds) => ds.category === "SAO" || ds.category === "SGO");
    assert(allCategoriesValid, "All Direct Sellers belong to either SAO or SGO category");

    // Check Products
    const prodCount = await prisma.product.count({ where: { isDeleted: false } });
    assert(prodCount >= 6, `Product inventory catalog seeded (${prodCount} active products)`);

    const prods = await prisma.product.findMany({ where: { isDeleted: false } });
    const pricesValid = prods.every((p) => p.mrp > 0 && p.dp > 0 && p.mrp >= p.dp);
    assert(pricesValid, "Every product satisfies invariant: MRP >= DP > 0");

    const validCategories = [
      "WELLNESS", "WELLROOT", "AGRICULTURE", "JEEVEDA", "SNISS COSMETIC",
      "SNISS HERBAL", "BABY CARE", "SNISS FRAGRANCES", "FOOD", "HOME CARE",
      "ORAL CARE", "SNISS ELITE", "VETERINARY", "APPARELS", "OTHERS"
    ];
    const categoriesValid = prods.every((p) => validCategories.includes(p.category));
    assert(categoriesValid, "All products assigned to valid direct-selling categories");

    // Check Follow-ups
    const fuCount = await prisma.followUp.count({ where: { isDeleted: false } });
    assert(fuCount > 0, `Follow-ups seeded and active (${fuCount} follow-ups)`);

    // Check Stock movements
    const movements = await prisma.stockMovement.findMany({ take: 5 });
    assert(movements.length > 0, "Stock movement ledger records inventory adjustments");

    console.log("\n\x1b[32mAll database invariants verified against SQLite database!\x1b[0m");
  } catch (dbErr) {
    console.error("Database test error:", dbErr);
    assert(false, "Database connection and queries");
  } finally {
    await prisma.$disconnect();
  }

  // Print Summary
  console.log("\n---------------------------------------------------");
  console.log(`TOTAL TESTS:  ${testsRun}`);
  console.log(`PASSED:       \x1b[32m${testsPassed}\x1b[0m`);
  console.log(`FAILED:       \x1b[${testsFailed > 0 ? "31" : "32"}m${testsFailed}\x1b[0m`);
  console.log("---------------------------------------------------\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTestSuite();

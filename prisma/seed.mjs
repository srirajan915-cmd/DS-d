import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // 1. Seed Admin User
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@directsell.com" },
    update: {},
    create: {
      name: "Admin Owner",
      email: "admin@directsell.com",
      phone: "9876543210",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      isActive: true,
    },
  });
  console.log(`✓ Admin user ready: ${admin.email} (Password: admin123)`);

  // 2. Seed Sample Direct Sellers
  const directSellers = [
    {
      dsCode: "DS1001",
      name: "Rajesh Kumar",
      phone: "9876500001",
      city: "Mumbai",
      address: "B-402, Green Meadows, Andheri East",
      category: "SAO",
      status: "ACTIVE",
      joiningDate: new Date("2025-01-15"),
      notes: "High performing team leader in Mumbai zone.",
    },
    {
      dsCode: "DS1002",
      name: "Priya Sharma",
      phone: "9876500002",
      city: "Pune",
      address: "12, Shanti Nagar, Kothrud",
      category: "SAO",
      status: "ACTIVE",
      joiningDate: new Date("2025-02-10"),
      notes: "Active in health and wellness direct sales.",
    },
    {
      dsCode: "DS1003",
      name: "Amit Patel",
      phone: "9876500003",
      city: "Ahmedabad",
      address: "704, Shivalik High Street",
      category: "SAO",
      status: "ACTIVE",
      joiningDate: new Date("2025-03-01"),
      notes: "Focusing on cosmetics and hair care line.",
    },
    {
      dsCode: "DS2001",
      name: "Sunita Verma",
      phone: "9876500004",
      city: "Delhi",
      address: "Plot 45, Sector 14, Rohini",
      category: "SGO",
      status: "ACTIVE",
      joiningDate: new Date("2025-01-20"),
      notes: "Strong retail customer network in Delhi NCR.",
    },
    {
      dsCode: "DS2002",
      name: "Vikram Singh",
      phone: "9876500005",
      city: "Jaipur",
      address: "18, Malviya Nagar",
      category: "SGO",
      status: "ACTIVE",
      joiningDate: new Date("2025-02-18"),
      notes: "New distributor showing rapid weekly growth.",
    },
    {
      dsCode: "DS2003",
      name: "Deepak Gupta",
      phone: "9876500006",
      city: "Lucknow",
      address: "B-12, Gomti Nagar",
      category: "SGO",
      status: "INACTIVE",
      joiningDate: new Date("2024-11-05"),
      notes: "Needs re-engagement and product refresher.",
    },
  ];

  for (const ds of directSellers) {
    await prisma.directSeller.upsert({
      where: { dsCode: ds.dsCode },
      update: {},
      create: ds,
    });
  }
  console.log(`✓ Seeded ${directSellers.length} Direct Sellers (SAO & SGO)`);

  // 3. Seed Sample Products across the 15 Categories
  const products = [
    {
      name: "Aloe Vera Health Juice 1L",
      sku: "HL-ALOE-1L",
      category: "WELLNESS",
      mrp: 550,
      dp: 440,
      currentStock: 45,
      reorderLevel: 10,
      batchNumber: "B2601",
      expiryDate: new Date("2027-12-31"),
    },
    {
      name: "Spirulina Superfood 60s",
      sku: "HL-SPIR-60",
      category: "WELLNESS",
      mrp: 650,
      dp: 500,
      currentStock: 18,
      reorderLevel: 10,
      batchNumber: "B2602",
      expiryDate: new Date("2028-05-30"),
    },
    {
      name: "Omega-3 Gold Fish Oil 60 Softgels",
      sku: "HL-OMG-60",
      category: "WELLROOT",
      mrp: 999,
      dp: 750,
      currentStock: 4, // Critical low stock alert demo
      reorderLevel: 12,
      batchNumber: "B2604",
      expiryDate: new Date("2027-10-15"),
    },
    {
      name: "Organic Bio-Crop Soil Enhancer 1L",
      sku: "AG-BIO-1L",
      category: "AGRICULTURE",
      mrp: 850,
      dp: 620,
      currentStock: 30,
      reorderLevel: 10,
      batchNumber: "AG2601",
      expiryDate: new Date("2028-04-30"),
    },
    {
      name: "Immunity Shield Daily Tablets 30s",
      sku: "JV-IMM-30",
      category: "JEEVEDA",
      mrp: 750,
      dp: 560,
      currentStock: 22,
      reorderLevel: 8,
      batchNumber: "JV2601",
      expiryDate: new Date("2028-02-28"),
    },
    {
      name: "Sniss Daily Radiance BB Cream 50g",
      sku: "SC-BBC-50",
      category: "SNISS COSMETIC",
      mrp: 450,
      dp: 340,
      currentStock: 15,
      reorderLevel: 6,
      batchNumber: "SC2601",
      expiryDate: new Date("2027-11-30"),
    },
    {
      name: "Neem & Tulsi Herbal Face Wash 150ml",
      sku: "PC-NEEM-150",
      category: "SNISS HERBAL",
      mrp: 299,
      dp: 220,
      currentStock: 8, // Low stock alert demo
      reorderLevel: 15,
      batchNumber: "B2603",
      expiryDate: new Date("2027-08-31"),
    },
    {
      name: "Herbal Bhringraj Hair Oil 200ml",
      sku: "PC-BHR-200",
      category: "SNISS HERBAL",
      mrp: 380,
      dp: 290,
      currentStock: 35,
      reorderLevel: 10,
      batchNumber: "B2605",
      expiryDate: new Date("2028-01-01"),
    },
    {
      name: "Gentle Baby Nourishing Wash 200ml",
      sku: "BC-WASH-200",
      category: "BABY CARE",
      mrp: 320,
      dp: 240,
      currentStock: 20,
      reorderLevel: 8,
      batchNumber: "BC2601",
      expiryDate: new Date("2028-06-30"),
    },
    {
      name: "Sniss Royal Oud Eau De Parfum 100ml",
      sku: "SF-OUD-100",
      category: "SNISS FRAGRANCES",
      mrp: 1250,
      dp: 890,
      currentStock: 12,
      reorderLevel: 5,
      batchNumber: "SF2601",
      expiryDate: new Date("2029-01-01"),
    },
    {
      name: "Organic Himalayan Green Tea 100g",
      sku: "FD-TEA-100",
      category: "FOOD",
      mrp: 280,
      dp: 210,
      currentStock: 40,
      reorderLevel: 10,
      batchNumber: "FD2601",
      expiryDate: new Date("2027-09-30"),
    },
    {
      name: "Multi-Enzyme Dishwash Concentrate 500ml",
      sku: "HC-DISH-500",
      category: "HOME CARE",
      mrp: 260,
      dp: 195,
      currentStock: 25,
      reorderLevel: 8,
      batchNumber: "HC2601",
      expiryDate: new Date("2028-12-31"),
    },
    {
      name: "Clove & Mint Herbal Toothpaste 100g",
      sku: "OC-CLOVE-100",
      category: "ORAL CARE",
      mrp: 140,
      dp: 105,
      currentStock: 60,
      reorderLevel: 15,
      batchNumber: "OC2601",
      expiryDate: new Date("2028-03-31"),
    },
    {
      name: "Sniss Elite 24K Gold Skin Serum 30ml",
      sku: "SE-GLD-30",
      category: "SNISS ELITE",
      mrp: 1850,
      dp: 1350,
      currentStock: 10,
      reorderLevel: 4,
      batchNumber: "SE2601",
      expiryDate: new Date("2028-08-31"),
    },
    {
      name: "Cal-D3 Livestock & Cattle Feed Tonic 1L",
      sku: "VT-CAL-1L",
      category: "VETERINARY",
      mrp: 480,
      dp: 360,
      currentStock: 16,
      reorderLevel: 6,
      batchNumber: "VT2601",
      expiryDate: new Date("2027-11-30"),
    },
    {
      name: "Direct Seller Official Polo T-Shirt (M)",
      sku: "AP-POLO-M",
      category: "APPARELS",
      mrp: 699,
      dp: 499,
      currentStock: 25,
      reorderLevel: 5,
      batchNumber: "AP2601",
      expiryDate: null,
    },
  ];

  for (const prod of products) {
    const existing = await prisma.product.findUnique({ where: { sku: prod.sku } });
    if (!existing) {
      const created = await prisma.product.create({ data: prod });
      // Create initial stock movement log
      await prisma.stockMovement.create({
        data: {
          productId: created.id,
          type: "IN",
          quantity: prod.currentStock,
          previousStock: 0,
          newStock: prod.currentStock,
          referenceType: "UPLOAD",
          notes: "Initial inventory setup",
        },
      });
    } else {
      // Update category and details if already exists
      await prisma.product.update({
        where: { sku: prod.sku },
        data: {
          category: prod.category,
        },
      });
    }
  }
  console.log(`✓ Seeded & updated ${products.length} Products with authentic Categories`);

  // 4. Seed Sample Customers
  const customers = [
    {
      name: "Ramesh Rao",
      phone: "9988776655",
      city: "Bengaluru",
      address: "102, 4th Cross, Indiranagar",
      notes: "Regular buyer of Aloe Vera and Spirulina",
    },
    {
      name: "Kavita Nair",
      phone: "9887766554",
      city: "Chennai",
      address: "5A, Anna Nagar West",
      notes: "Interested in natural skincare products",
    },
    {
      name: "Suresh Menon",
      phone: "9776655443",
      city: "Kochi",
      address: "Flat 301, Marine Drive",
      notes: "Gym enthusiast, purchases protein powder",
    },
  ];

  for (const cust of customers) {
    const existing = await prisma.customer.findFirst({ where: { phone: cust.phone } });
    if (!existing) {
      await prisma.customer.create({ data: cust });
    }
  }
  console.log(`✓ Seeded ${customers.length} Customers`);

  // 5. Seed Default Message Templates
  const templates = [
    {
      name: "Product Experience Follow-up",
      type: "PRODUCT_FOLLOWUP",
      isDefault: true,
      content:
        "Namaste {name} ji! 🙏 Hope you are having a wonderful day. It's been a few weeks since you started with {product}. How is your experience so far? Please let me know if you have any questions or need a refill!",
    },
    {
      name: "Direct Seller Milestone Check-in",
      type: "DS_FOLLOWUP",
      isDefault: true,
      content:
        "Hello {name} ji ({ds_code}), checking in to see how your direct selling targets are going this week! Let's connect soon to plan your next customer meetings and stock requirements. Together towards growth! 🚀",
    },
    {
      name: "Order Confirmation & Receipt",
      type: "ORDER_RECEIPT",
      isDefault: true,
      content:
        "Namaste {name} ji, thank you for your order #{order_number} for ₹{amount}! Your products have been reserved and will be ready for dispatch/collection. Thank you for your continued trust! ✨",
    },
    {
      name: "Low Stock Alert (Internal)",
      type: "STOCK_ALERT",
      isDefault: true,
      content:
        "Alert: Stock for {product} is critically low (remaining: {amount}). Please replenish soon to avoid delivery delays.",
    },
  ];

  for (const tpl of templates) {
    const existing = await prisma.messageTemplate.findFirst({ where: { name: tpl.name } });
    if (!existing) {
      await prisma.messageTemplate.create({ data: tpl });
    }
  }
  console.log(`✓ Seeded ${templates.length} Message Templates`);

  // 6. Seed Sample Follow-ups (Today & Upcoming)
  const allProds = await prisma.product.findMany();
  const allCustomers = await prisma.customer.findMany();
  const allDS = await prisma.directSeller.findMany();

  const today = new Date();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

  if (allCustomers.length > 0 && allProds.length > 0) {
    // 1 Overdue product follow-up
    await prisma.followUp.create({
      data: {
        type: "PRODUCT",
        personType: "CUSTOMER",
        customerId: allCustomers[0].id,
        productId: allProds[0].id,
        followUpDate: yesterday,
        status: "PENDING",
        notes: "Check if Aloe juice bottle is finished and if refill is needed.",
      },
    });

    // 1 Today's product follow-up
    await prisma.followUp.create({
      data: {
        type: "PRODUCT",
        personType: "CUSTOMER",
        customerId: allCustomers[1].id,
        productId: allProds[2].id,
        followUpDate: today,
        status: "PENDING",
        notes: "Check results with Neem & Tulsi face wash for skin clarity.",
      },
    });
  }

  if (allDS.length > 0) {
    // 1 Today's DS follow-up
    await prisma.followUp.create({
      data: {
        type: "DS",
        personType: "DS",
        directSellerId: allDS[0].id,
        followUpDate: today,
        status: "PENDING",
        notes: "Review monthly sales volume and team recruitment pipeline.",
      },
    });

    // 1 Upcoming DS follow-up
    await prisma.followUp.create({
      data: {
        type: "DS",
        personType: "DS",
        directSellerId: allDS[3].id,
        followUpDate: tomorrow,
        status: "PENDING",
        notes: "Follow up on product catalog distribution in Rohini area.",
      },
    });
  }
  console.log("✓ Seeded sample follow-ups (Overdue, Today, Tomorrow)");

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

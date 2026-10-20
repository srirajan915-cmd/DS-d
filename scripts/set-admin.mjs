import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function setAdmin() {
  const hash = await bcrypt.hash("Tycoonssk@2008", 10);
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (existingAdmin) {
    const updated = await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        name: "Sri Rajan",
        email: "srirajan915@gmail.com",
        phone: "8015123605",
        passwordHash: hash,
        failedAttempts: 0,
        lockoutUntil: null,
      },
    });
    console.log("Admin updated successfully:");
    console.log({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      role: updated.role,
    });
  } else {
    const created = await prisma.user.create({
      data: {
        name: "Sri Rajan",
        email: "srirajan915@gmail.com",
        phone: "8015123605",
        passwordHash: hash,
        role: "ADMIN",
        isActive: true,
      },
    });
    console.log("Admin created successfully:");
    console.log({
      id: created.id,
      name: created.name,
      email: created.email,
      phone: created.phone,
      role: created.role,
    });
  }
}

setAdmin()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

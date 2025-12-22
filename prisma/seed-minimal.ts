import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting minimal seed (no groups/articles)...\n");

  // Clear existing data
  console.log("🗑️  Clearing existing data...");
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.tax.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  // CREATE COMPANY
  console.log("\n📦 Creating company...");
  const company = await prisma.company.create({
    data: {
      id: "default-company",
      name: "FactureXL SARL",
      email: "contact@facturexl.nc",
      phone: "+687 123 456",
      address: "123 Rue de la Baie",
      city: "Noumea",
      codePostal: "98800",
      description: "Entreprise de services professionnels",
      bank: "BCI Nouvelle-Caledonie",
      account: "12345678901",
      iban: "NC12 3456 7890 1234 5678 9012",
    },
  });
  console.log(`   ✅ Company: ${company.name}`);

  // CREATE TAXES
  console.log("\n💰 Creating taxes...");
  const taxes = await Promise.all([
    prisma.tax.create({ data: { id: "tgc-0", name: "TGC 0%", percent: 0 } }),
    prisma.tax.create({ data: { id: "tgc-3", name: "TGC 3%", percent: 3 } }),
    prisma.tax.create({ data: { id: "tgc-6", name: "TGC 6%", percent: 6 } }),
    prisma.tax.create({ data: { id: "tgc-11", name: "TGC 11%", percent: 11 } }),
    prisma.tax.create({ data: { id: "tgc-22", name: "TGC 22%", percent: 22 } }),
  ]);
  console.log(`   ✅ Created ${taxes.length} taxes`);

  // CREATE USERS
  console.log("\n👥 Creating users...");
  const hashedPassword = await bcrypt.hash("password123", 10);

  const superAdmin = await prisma.user.create({
    data: {
      name: "Super Admin",
      email: "superadmin@facturexl.com",
      password: hashedPassword,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  const owner = await prisma.user.create({
    data: {
      name: "Jean Dupont",
      email: "owner@facturexl.com",
      password: hashedPassword,
      role: "OWNER",
      isActive: true,
      companyId: company.id,
      phone: "+687 111 111",
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: "Marie Martin",
      email: "admin@facturexl.com",
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
      companyId: company.id,
      phone: "+687 222 222",
    },
  });

  const employee = await prisma.user.create({
    data: {
      name: "Pierre Bernard",
      email: "employee@facturexl.com",
      password: hashedPassword,
      role: "EMPLOYEE",
      isActive: true,
      companyId: company.id,
      phone: "+687 333 333",
    },
  });

  const client = await prisma.user.create({
    data: {
      name: "SCI Pacific",
      email: "client@facturexl.com",
      password: hashedPassword,
      role: "CLIENT",
      isActive: true,
      companyId: company.id,
      phone: "+687 444 444",
    },
  });

  console.log(`   ✅ Created 5 users`);

  console.log("\n" + "=".repeat(50));
  console.log("✅ MINIMAL SEED COMPLETED!");
  console.log("=".repeat(50));
  console.log("\n📊 Summary:");
  console.log(`   - 1 Company`);
  console.log(`   - ${taxes.length} Taxes`);
  console.log(`   - 5 Users (Super Admin, Owner, Admin, Employee, Client)`);
  console.log(`   - 0 Invoices (create manually using the UI)`);

  console.log("\n🔐 Login credentials:");
  console.log("   All users have password: password123");
  console.log("   - superadmin@facturexl.com (SUPER_ADMIN)");
  console.log("   - owner@facturexl.com (OWNER)");
  console.log("   - admin@facturexl.com (ADMIN)");
  console.log("   - employee@facturexl.com (EMPLOYEE)");
  console.log("   - client@facturexl.com (CLIENT)");
}

main()
  .catch((e) => {
    console.error("❌ Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting minimal seed - ESSENTIAL USERS ONLY...\n");

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

  // CREATE USERS - ONLY ESSENTIAL 3 USERS
  console.log("\n👥 Creating essential users...");
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

  console.log(`   ✅ Created 3 essential users (Super Admin, Owner, Administrator)`);

  console.log("\n" + "=".repeat(50));
  console.log("✅ ESSENTIAL SEED COMPLETED!");
  console.log("=".repeat(50));
  console.log("\n📊 Summary:");
  console.log(`   - 1 Company`);
  console.log(`   - ${taxes.length} Taxes`);
  console.log(`   - 3 Essential Users (Super Admin, Owner, Administrator)`);
  console.log(`   - 0 Invoices (create manually using the UI)`);

  console.log("\n🔐 Login credentials (all use password: password123):");
  console.log("   - superadmin@facturexl.com (SUPER_ADMIN) - Full system access");
  console.log("   - owner@facturexl.com (OWNER) - Business owner");
  console.log("   - admin@facturexl.com (ADMIN) - Administrator");

  console.log("\n💡 Note: All other users must sign up through the registration process.");
}

main()
  .catch((e) => {
    console.error("❌ Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

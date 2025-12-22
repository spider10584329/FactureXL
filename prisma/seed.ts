import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Helper to generate random date within a range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper to generate reference numbers
function generateRef(prefix: string, num: number): string {
  return `${prefix}-${new Date().getFullYear()}-${String(num).padStart(5, "0")}`;
}

async function main() {
  console.log("🌱 Starting seed...\n");

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log("🗑️  Clearing existing data...");
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.tax.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  // =====================================================
  // 1. CREATE COMPANY
  // =====================================================
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
      description: "Entreprise de services professionnels en Nouvelle-Caledonie",
      bank: "BCI Nouvelle-Caledonie",
      account: "12345678901",
      iban: "NC12 3456 7890 1234 5678 9012",
    },
  });
  console.log(`   ✅ Company: ${company.name}`);

  // =====================================================
  // 2. CREATE TAXES
  // =====================================================
  console.log("\n💰 Creating taxes...");
  const taxes = await Promise.all([
    prisma.tax.create({ data: { id: "tgc-0", name: "TGC 0%", percent: 0 } }),
    prisma.tax.create({ data: { id: "tgc-3", name: "TGC 3%", percent: 3 } }),
    prisma.tax.create({ data: { id: "tgc-6", name: "TGC 6%", percent: 6 } }),
    prisma.tax.create({ data: { id: "tgc-11", name: "TGC 11%", percent: 11 } }),
    prisma.tax.create({ data: { id: "tgc-22", name: "TGC 22%", percent: 22 } }),
  ]);
  console.log(`   ✅ Created ${taxes.length} taxes`);

  // =====================================================
  // 3. SAMPLE PRODUCTS (for invoice generation)
  // =====================================================
  const sampleProducts = [
    { title: "Developpement Web", price: 12000, unite: "jour", tax: 11 },
    { title: "Developpement Mobile", price: 15000, unite: "jour", tax: 11 },
    { title: "Integration API", price: 8000, unite: "jour", tax: 11 },
    { title: "Audit Securite", price: 25000, unite: "forfait", tax: 11 },
    { title: "Consultation Strategie", price: 18000, unite: "jour", tax: 11 },
    { title: "Analyse de Marche", price: 35000, unite: "forfait", tax: 11 },
    { title: "Accompagnement Projet", price: 10000, unite: "jour", tax: 11 },
    { title: "Formation Excel", price: 45000, unite: "session", tax: 6 },
    { title: "Formation Word", price: 35000, unite: "session", tax: 6 },
    { title: "Formation PowerPoint", price: 30000, unite: "session", tax: 6 },
    { title: "Formation Management", price: 120000, unite: "session", tax: 6 },
    { title: "Maintenance Mensuelle", price: 25000, unite: "mois", tax: 11 },
    { title: "Support Technique", price: 5000, unite: "heure", tax: 11 },
    { title: "Mise a jour Systeme", price: 15000, unite: "intervention", tax: 11 },
    { title: "Creation Logo", price: 80000, unite: "forfait", tax: 11 },
    { title: "Charte Graphique", price: 150000, unite: "forfait", tax: 11 },
    { title: "Design UI/UX", price: 20000, unite: "jour", tax: 11 },
  ];

  // =====================================================
  // 4. CREATE USERS
  // =====================================================
  console.log("\n👥 Creating users...");
  const hashedPassword = await bcrypt.hash("password123", 10);

  // Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      name: "Super Admin",
      email: "superadmin@facturexl.com",
      password: hashedPassword,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  // Owner
  const owner = await prisma.user.create({
    data: {
      name: "Jean Dupont",
      email: "owner@facturexl.com",
      password: hashedPassword,
      role: "OWNER",
      isActive: true,
      companyId: company.id,
      phone: "+687 111 111",
      address: "1 Rue du Proprietaire",
      city: "Noumea",
      zipCode: "98800",
    },
  });

  // Admin
  const admin = await prisma.user.create({
    data: {
      name: "Marie Martin",
      email: "admin@facturexl.com",
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
      companyId: company.id,
      phone: "+687 222 222",
      address: "2 Rue de l'Admin",
      city: "Noumea",
      zipCode: "98800",
    },
  });

  // Employees
  const employeesData = [
    { name: "Pierre Bernard", email: "pierre@facturexl.com", phone: "+687 333 333" },
    { name: "Sophie Leroy", email: "sophie@facturexl.com", phone: "+687 444 444" },
    { name: "Lucas Moreau", email: "lucas@facturexl.com", phone: "+687 555 555" },
  ];

  const employees = await Promise.all(
    employeesData.map((e, i) =>
      prisma.user.create({
        data: {
          name: e.name,
          email: e.email,
          password: hashedPassword,
          role: "EMPLOYEE",
          isActive: true,
          companyId: company.id,
          phone: e.phone,
          turnover: 10 + i * 2, // Commission rate
          code: `EMP${String(i + 1).padStart(3, "0")}`,
        },
      })
    )
  );

  // Clients
  const clientsData = [
    { name: "SCI Immobilier Pacific", email: "contact@sci-pacific.nc", code: "CLI001", city: "Noumea", discount: 5 },
    { name: "Restaurant Le Meridien", email: "info@lemeridien.nc", code: "CLI002", city: "Noumea", discount: 0 },
    { name: "Garage Auto NC", email: "garage@autonc.nc", code: "CLI003", city: "Dumbea", discount: 10 },
    { name: "Boutique Mode NC", email: "mode@boutiquenc.nc", code: "CLI004", city: "Mont-Dore", discount: 0 },
    { name: "Cabinet Medical Central", email: "rdv@cabinetcentral.nc", code: "CLI005", city: "Noumea", discount: 15 },
    { name: "Ecole Primaire Sacre-Coeur", email: "direction@sacrecoeur.nc", code: "CLI006", city: "Noumea", discount: 20 },
    { name: "Transport Maritime NC", email: "contact@transportnc.nc", code: "CLI007", city: "Noumea", discount: 5 },
    { name: "Hotel Le Pacifique", email: "reservation@lepacifique.nc", code: "CLI008", city: "Bourail", discount: 0 },
    { name: "Supermarche Casino", email: "direction@casinonc.nc", code: "CLI009", city: "Noumea", discount: 10 },
    { name: "Agence Voyage Evasion", email: "info@evasionnc.nc", code: "CLI010", city: "Noumea", discount: 5 },
    { name: "Electricite NC", email: "contact@elec-nc.nc", code: "CLI011", city: "Paita", discount: 0 },
    { name: "Plomberie Service Plus", email: "devis@plomberie.nc", code: "CLI012", city: "Dumbea", discount: 10 },
  ];

  const clients = await Promise.all(
    clientsData.map((c) =>
      prisma.user.create({
        data: {
          name: c.name,
          email: c.email,
          password: hashedPassword,
          role: "CLIENT",
          isActive: true,
          companyId: company.id,
          code: c.code,
          city: c.city,
          discount: c.discount,
          address: `${Math.floor(Math.random() * 100) + 1} Rue ${["de la Baie", "du Port", "des Cocotiers", "du Lagon", "des Flamboyants"][Math.floor(Math.random() * 5)]}`,
          zipCode: "98800",
          paymentMethod: ["Carte Bancaire", "Virement", "Cheque", "Especes"][Math.floor(Math.random() * 4)],
        },
      })
    )
  );

  console.log(`   ✅ Created ${1 + 1 + 1 + employees.length + clients.length} users`);
  console.log(`      - 1 Super Admin`);
  console.log(`      - 1 Owner`);
  console.log(`      - 1 Admin`);
  console.log(`      - ${employees.length} Employees`);
  console.log(`      - ${clients.length} Clients`);

  // =====================================================
  // 6. CREATE INVOICES
  // =====================================================
  console.log("\n📄 Creating invoices...");

  const allEmployees = [owner, admin, ...employees];
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  const today = new Date();

  let invoiceCounter = 1;
  const invoices = [];

  // Create invoices for each month of the current year
  for (let month = 0; month <= today.getMonth(); month++) {
    const monthStart = new Date(today.getFullYear(), month, 1);
    const monthEnd = new Date(today.getFullYear(), month + 1, 0);

    // Create 5-10 invoices per month
    const numInvoices = Math.floor(Math.random() * 6) + 5;

    for (let i = 0; i < numInvoices; i++) {
      const client = clients[Math.floor(Math.random() * clients.length)];
      const employee = allEmployees[Math.floor(Math.random() * allEmployees.length)];
      const invoiceDate = randomDate(monthStart, monthEnd > today ? today : monthEnd);
      const isPaid = Math.random() > 0.3; // 70% chance of being paid
      const paymentMethod = ["Carte Bancaire", "Virement", "Cheque", "Especes"][Math.floor(Math.random() * 4)];

      // Generate 1-4 items per invoice
      const numItems = Math.floor(Math.random() * 4) + 1;
      const items = [];
      let totalHT = 0;
      let totalTTC = 0;

      for (let j = 0; j < numItems; j++) {
        const product = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
        const quantity = Math.floor(Math.random() * 5) + 1;
        const discount = Math.random() > 0.7 ? Math.floor(Math.random() * 15) : 0;
        const taxRate = product.tax;

        const subtotal = product.price * quantity;
        const discountAmount = subtotal * (discount / 100);
        const afterDiscount = subtotal - discountAmount;
        const taxAmount = afterDiscount * (taxRate / 100);

        totalHT += afterDiscount;
        totalTTC += afterDiscount + taxAmount;

        items.push({
          product: product.title,
          price: product.price,
          quantity,
          discount,
          tax: taxRate,
          unite: product.unite,
          description: `${product.title} - Prestation pour ${client.name}`,
        });
      }

      const invoice = await prisma.invoice.create({
        data: {
          ref: generateRef("FAC", invoiceCounter++),
          type: "invoice",
          clientId: client.id,
          employeeId: employee.id,
          companyId: company.id,
          totalHT: Math.round(totalHT),
          total: Math.round(totalTTC),
          paid: isPaid,
          paymentDate: isPaid ? randomDate(invoiceDate, new Date(invoiceDate.getTime() + 15 * 24 * 60 * 60 * 1000)) : null,
          lastPaymentMethod: isPaid ? paymentMethod : null,
          createdAt: invoiceDate,
          items: {
            create: items,
          },
        },
      });

      invoices.push(invoice);
    }
  }
  console.log(`   ✅ Created ${invoices.length} invoices`);

  // =====================================================
  // 7. CREATE CREDITS (Avoirs)
  // =====================================================
  console.log("\n📄 Creating credits (avoirs)...");
  let creditCounter = 1;
  const credits = [];

  // Create some credits
  for (let i = 0; i < 8; i++) {
    const client = clients[Math.floor(Math.random() * clients.length)];
    const employee = allEmployees[Math.floor(Math.random() * allEmployees.length)];
    const creditDate = randomDate(startOfYear, today);

    const product = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
    const quantity = Math.floor(Math.random() * 3) + 1;
    const taxRate = product.tax;

    const totalHT = product.price * quantity;
    const totalTTC = totalHT * (1 + taxRate / 100);

    const credit = await prisma.invoice.create({
      data: {
        ref: generateRef("AVO", creditCounter++),
        type: "avoir",
        clientId: client.id,
        employeeId: employee.id,
        companyId: company.id,
        totalHT: Math.round(totalHT),
        total: Math.round(totalTTC),
        paid: true,
        paymentDate: creditDate,
        createdAt: creditDate,
        wording: "Avoir - Remboursement partiel",
        items: {
          create: [{
            product: product.title,
            price: product.price,
            quantity,
            discount: 0,
            tax: taxRate,
            unite: product.unite,
            description: `Avoir pour ${client.name}`,
          }],
        },
      },
    });

    credits.push(credit);
  }
  console.log(`   ✅ Created ${credits.length} credits`);

  // =====================================================
  // 8. CREATE QUOTES (Devis)
  // =====================================================
  console.log("\n📄 Creating quotes (devis)...");
  let quoteCounter = 1;
  const quotes = [];

  // Create some quotes
  for (let i = 0; i < 15; i++) {
    const client = clients[Math.floor(Math.random() * clients.length)];
    const employee = allEmployees[Math.floor(Math.random() * allEmployees.length)];
    const quoteDate = randomDate(new Date(today.getFullYear(), today.getMonth() - 2, 1), today);

    const numItems = Math.floor(Math.random() * 3) + 1;
    const items = [];
    let totalHT = 0;
    let totalTTC = 0;

    for (let j = 0; j < numItems; j++) {
      const product = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
      const quantity = Math.floor(Math.random() * 10) + 1;
      const taxRate = product.tax;

      const subtotal = product.price * quantity;
      const taxAmount = subtotal * (taxRate / 100);

      totalHT += subtotal;
      totalTTC += subtotal + taxAmount;

      items.push({
        product: product.title,
        price: product.price,
        quantity,
        discount: 0,
        tax: taxRate,
        unite: product.unite,
        description: `Devis - ${product.title}`,
      });
    }

    const quote = await prisma.invoice.create({
      data: {
        ref: generateRef("DEV", quoteCounter++),
        type: "devis",
        clientId: client.id,
        employeeId: employee.id,
        companyId: company.id,
        totalHT: Math.round(totalHT),
        total: Math.round(totalTTC),
        paid: false,
        createdAt: quoteDate,
        wording: "Devis valable 30 jours",
        items: {
          create: items,
        },
      },
    });

    quotes.push(quote);
  }
  console.log(`   ✅ Created ${quotes.length} quotes`);

  // =====================================================
  // 9. CREATE TRANSFERS (Pending payments by wire transfer)
  // =====================================================
  console.log("\n💸 Creating pending transfers...");

  // Find unpaid invoices and mark some as pending transfers
  const unpaidInvoices = invoices.filter(inv => !inv.paid);
  const transferInvoices = unpaidInvoices.slice(0, Math.min(5, unpaidInvoices.length));

  for (const inv of transferInvoices) {
    await prisma.invoice.update({
      where: { id: inv.id },
      data: { lastPaymentMethod: "Virement" },
    });
  }
  console.log(`   ✅ Marked ${transferInvoices.length} invoices as pending transfers`);

  // =====================================================
  // SUMMARY
  // =====================================================
  console.log("\n" + "=".repeat(50));
  console.log("✅ SEED COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(50));
  console.log("\n📊 Summary:");
  console.log(`   - 1 Company`);
  console.log(`   - ${taxes.length} Taxes`);
  console.log(`   - ${1 + 1 + 1 + employees.length + clients.length} Users`);
  console.log(`   - ${invoices.length} Invoices`);
  console.log(`   - ${credits.length} Credits (Avoirs)`);
  console.log(`   - ${quotes.length} Quotes (Devis)`);

  console.log("\n🔐 Login credentials:");
  console.log("   ┌─────────────────────────────────────────────────┐");
  console.log("   │ Role        │ Email                  │ Password │");
  console.log("   ├─────────────────────────────────────────────────┤");
  console.log("   │ Super Admin │ superadmin@facturexl.com │ password123 │");
  console.log("   │ Owner       │ owner@facturexl.com      │ password123 │");
  console.log("   │ Admin       │ admin@facturexl.com      │ password123 │");
  console.log("   │ Employee    │ pierre@facturexl.com     │ password123 │");
  console.log("   │ Client      │ contact@sci-pacific.nc   │ password123 │");
  console.log("   └─────────────────────────────────────────────────┘");
}

main()
  .catch((e) => {
    console.error("❌ Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

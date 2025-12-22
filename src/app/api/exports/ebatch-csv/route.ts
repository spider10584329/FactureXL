import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDateDDMMYYYY(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function csvEscape(value: unknown) {
  const s = (value ?? "NULL").toString();
  // Match the sample where everything is quoted
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start"); // yyyy-mm-dd
    const endDate = searchParams.get("end"); // yyyy-mm-dd

    const where: any = {
      companyId: session.user.companyId ?? undefined,
      type: "invoice",
      // mimic exported accounting entries: usually only validated invoices
      // if you want only paid, you can change later
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) where.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        client: {
          select: {
            code: true,
            name: true,
            address: true,
            city: true,
            zipCode: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Columns requested by customer
    const header = [
      "DATE",
      "COMPTE",
      "TIERS",
      "JOURNAL",
      "PIECE",
      "MONTANT",
      "DC",
      "LIBELLE",
      "CONTREPTIE",
      "SCCONTR",
      "SECTEUR",
      "NATURE",
      "DATREGLE",
      "NUMLET",
      "NOM",
      "AD1",
      "AD2",
      "AD3",
      "AD4",
      "AD5",
      "TEL",
      "FAX",
      "GROUPE",
      "ADMAIL",
      "NOMBQ",
      "NUMBQE",
      "TITULAIRE",
      "REPRES",
      "TEST",
    ].join(",");

    const lines: string[] = [header];

    for (const inv of invoices) {
      const client = inv.client;

      // In their sample, TIERS seems to be a numeric client code.
      // If your client.code is empty or non-numeric, we export NULL.
      const tiers = client?.code && /^\d+$/.test(String(client.code).trim()) ? String(client.code).trim() : "NULL";

      // In their sample, COMPTE = 411000 (customer account)
      // JOURNAL = FAC
      // DC = D (debit)
      const row = [
        formatDateDDMMYYYY(new Date(inv.createdAt)),
        "411000",
        tiers,
        "FAC",
        inv.ref ?? "NULL",
        String(inv.total ?? 0),
        "D",
        // LIBELLE: keep short-ish; example uses invoice wording
        (inv.wording || `FACT ${client?.name ?? ""}`).toString().slice(0, 30),
        "NULL",
        "NULL",
        "NULL",
        "NULL",
        "NULL",
        "NULL",
        client?.name ?? "NULL",
        // AD1..AD5: split address like their sample (rough mapping)
        client?.address ?? "NULL",
        [client?.zipCode, client?.city].filter(Boolean).join(" ") || "NULL",
        "NULL",
        "NULL",
        "NULL",
        client?.phone ?? "NULL",
        "NULL",
        "NULL",
        client?.email ?? "NULL",
        "NULL",
        "NULL",
        "NULL",
        "1",
        "NULL",
      ].map(csvEscape);

      lines.push(row.join(","));
    }

    const csv = lines.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=ebatch.csv`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error exporting ebatch CSV:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

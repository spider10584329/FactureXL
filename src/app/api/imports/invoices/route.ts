import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

function parseDateDDMMYYYY(value: string): Date | null {
  const s = (value || "").trim();
  const m = /^([0-3]\d)\/([0-1]\d)\/(\d{4})$/.exec(s);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  const d = new Date(yyyy, mm - 1, dd);
  return Number.isFinite(d.getTime()) ? d : null;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json({ error: "Missing companyId" }, { status: 400 });
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors?.length) {
      return NextResponse.json({ error: "CSV parse error", details: parsed.errors }, { status: 400 });
    }

    const rows = parsed.data || [];

    let created = 0;
    let skipped = 0;

    for (const row of rows) {
      const ref = (row.PIECE || row.piece || "").toString().trim();
      const clientName = (row.NOM || row.nom || "").toString().trim();
      const clientEmail = (row.ADMAIL || row.email || "").toString().trim();
      const total = Number((row.MONTANT || "0").toString().replace(",", "."));
      const createdAt = parseDateDDMMYYYY((row.DATE || "").toString()) || new Date();

      if (!ref || !clientName) {
        skipped++;
        continue;
      }

      // Find or create client
      const email = clientEmail || `import-${Date.now()}-${Math.random().toString(16).slice(2)}@temporary.local`;
      let client = await prisma.user.findUnique({ where: { email } });
      if (!client) {
        client = await prisma.user.create({
          data: {
            name: clientName,
            email,
            password: "password123",
            role: "CLIENT",
            isActive: true,
            companyId,
          },
        });
      }

      // Prevent duplicates by invoice ref within the same company
      const existing = await prisma.invoice.findFirst({
        where: {
          companyId,
          ref,
          type: "invoice",
        },
        select: { id: true },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.invoice.create({
        data: {
          ref,
          type: "invoice",
          clientId: client.id,
          companyId,
          createdAt,
          total: Number.isFinite(total) ? total : 0,
          totalHT: 0,
          paid: false,
          // No items/data in eBatch CSV; left empty.
        },
      });

      created++;
    }

    return NextResponse.json({ ok: true, created, skipped, total: rows.length });
  } catch (error) {
    console.error("Invoice CSV import error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

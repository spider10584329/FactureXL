import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DBFFile } from "dbffile";

// Notes:
// - This endpoint supports importing clients from a DBF file matching the exported fields.
// - It performs an UPSERT by email (preferred) and falls back to code when email is missing.

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();

    // dbffile reads from a path, so we write to a temp file first
    const os = await import("os");
    const path = await import("path");
    const fs = await import("fs/promises");

    const tmpPath = path.join(os.tmpdir(), `facturexl-import-clients-${Date.now()}.dbf`);
    await fs.writeFile(tmpPath, Buffer.from(arrayBuffer));

    const dbf = await DBFFile.open(tmpPath);
    const records = await dbf.readRecords(dbf.recordCount);

    const results = { created: 0, updated: 0, skipped: 0, total: records.length };

    for (const r of records as any[]) {
      const name = (r.NOM ?? r.NAME ?? "").toString().trim();
      const email = (r.EMAIL ?? r.ADMAIL ?? "").toString().trim();
      const phone = (r.TELEPHONE ?? r.TEL ?? "").toString().trim();
      const address = (r.ADRESSE ?? r.AD1 ?? "").toString().trim();
      const code = r.CODE !== undefined && r.CODE !== null && r.CODE !== "" ? String(r.CODE).trim() : null;

      if (!name) {
        results.skipped++;
        continue;
      }

      // Prefer matching by email if available
      const whereUnique = email
        ? { email }
        : code
          ? { code_companyId: { code, companyId: session.user.companyId! } }
          : null;

      // If neither email nor code, create a temporary email so it can exist in the system
      const finalEmail = email || `client-${Date.now()}-${Math.random().toString(16).slice(2)}@temporary.local`;

      // Prisma schema likely has unique email globally; code is not unique globally.
      // We'll do: if email exists -> update; else create.
      const existing = await prisma.user.findUnique({ where: { email: finalEmail } });

      if (existing) {
        await prisma.user.update({
          where: { email: finalEmail },
          data: {
            name,
            phone: phone || undefined,
            address: address || undefined,
            code: code || undefined,
            role: "CLIENT",
            isActive: true,
            companyId: session.user.companyId,
          },
        });
        results.updated++;
      } else {
        await prisma.user.create({
          data: {
            name,
            email: finalEmail,
            password: "password123", // placeholder; user can reset later
            role: "CLIENT",
            isActive: true,
            phone: phone || undefined,
            address: address || undefined,
            code: code || undefined,
            companyId: session.user.companyId,
          },
        });
        results.created++;
      }
    }

    await fs.unlink(tmpPath).catch(() => undefined);

    return NextResponse.json({ ok: true, ...results });
  } catch (error) {
    console.error("Client DBF import error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

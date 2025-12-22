import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DBFFile, type FieldDescriptor } from "dbffile";

function safeString(value: unknown, maxLen: number) {
  const s = (value ?? "").toString();
  // DBF is typically not Unicode-friendly; keep it simple.
  // Truncate to column width.
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function safeNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Export only CLIENT users for the current company
    const clients = await prisma.user.findMany({
      where: {
        companyId: session.user.companyId ?? undefined,
        role: "CLIENT",
      },
      select: {
        code: true,
        name: true,
        address: true,
        phone: true,
        email: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Based on the screenshot: CODE | NOM | ADRESSE | GROUPE | TELEPHONE | INTERLOC. | EMAIL
    // We'll export a minimal DBF that most tools can open.
    const fields: FieldDescriptor[] = [
      { name: "CODE", type: "N", size: 10, decimalPlaces: 0 },
      { name: "NOM", type: "C", size: 60 },
      { name: "ADRESSE", type: "C", size: 80 },
      { name: "GROUPE", type: "C", size: 10 },
      { name: "TELEPHONE", type: "C", size: 25 },
      { name: "INTERLOC", type: "C", size: 40 },
      { name: "EMAIL", type: "C", size: 80 },
    ];

    // Create DBF in a temp file path (dbffile writes to disk)
    const os = await import("os");
    const path = await import("path");
    const fs = await import("fs/promises");

    const tmpPath = path.join(os.tmpdir(), `facturexl-clients-${Date.now()}.dbf`);

    const dbf = await DBFFile.create(tmpPath, fields);

    const records = clients.map((c) => ({
      CODE: safeNumber(c.code),
      NOM: safeString(c.name, 60),
      ADRESSE: safeString(c.address, 80),
      GROUPE: "", // not stored in current model
      TELEPHONE: safeString(c.phone, 25),
      INTERLOC: "", // not stored in current model
      EMAIL: safeString(c.email, 80),
    }));

    await dbf.appendRecords(records);

    const buf = await fs.readFile(tmpPath);
    await fs.unlink(tmpPath).catch(() => undefined);

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename=clients.dbf`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error exporting clients DBF:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

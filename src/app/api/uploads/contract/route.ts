import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const clientId = formData.get("clientId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!clientId) {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    // Verify client exists
    const client = await prisma.user.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Create contracts directory if it doesn't exist
    const contractsDir = join(process.cwd(), "public", "contracts");
    if (!existsSync(contractsDir)) {
      await mkdir(contractsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${clientId}_${timestamp}_${sanitizedName}`;

    const filepath = join(contractsDir, filename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Return the public URL path
    const contractUrl = `/contracts/${filename}`;

    // Save contract to database
    const contract = await prisma.contract.create({
      data: {
        name: file.name,
        filename: filename,
        url: contractUrl,
        fileSize: buffer.length,
        mimeType: file.type,
        clientId: clientId,
      },
    });

    return NextResponse.json({ 
      success: true, 
      contract,
    });
  } catch (error) {
    console.error("Error uploading contract:", error);
    return NextResponse.json({ error: "Failed to upload contract" }, { status: 500 });
  }
}

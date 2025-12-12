import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const taxSchema = z.object({
  name: z.string().min(1),
  percent: z.number().min(0).max(100),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const taxes = await prisma.tax.findMany({
      orderBy: { percent: "asc" },
    });

    return NextResponse.json(taxes);
  } catch (error) {
    console.error("Error fetching taxes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = taxSchema.parse(body);

    const tax = await prisma.tax.create({
      data: validatedData,
    });

    return NextResponse.json(tax, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating tax:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

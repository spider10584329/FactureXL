import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createCompanySchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  codePostal: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  bank: z.string().optional(),
  account: z.string().optional(),
  iban: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.companyId) {
      return NextResponse.json({ error: "No company associated" }, { status: 404 });
    }

    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error fetching company:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = createCompanySchema.parse(body);

    const hashedPassword = validatedData.password
      ? await bcrypt.hash(validatedData.password, 10)
      : null;

    const company = await prisma.company.create({
      data: {
        ...validatedData,
        password: hashedPassword,
      },
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating company:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { password, ...updateData } = body;

    const data: any = { ...updateData };
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const company = await prisma.company.update({
      where: { id: session.user.companyId },
      data,
    });

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error updating company:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

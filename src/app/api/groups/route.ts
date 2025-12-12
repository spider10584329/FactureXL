import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createGroupSchema = z.object({
  name: z.string().min(1),
  account: z.string().optional(),
  color: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const groups = await prisma.group.findMany({
      where: session.user.companyId ? { companyId: session.user.companyId } : {},
      include: {
        articles: true,
        _count: {
          select: { articles: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createGroupSchema.parse(body);

    const group = await prisma.group.create({
      data: {
        ...validatedData,
        companyId: session.user.companyId,
      },
      include: {
        articles: true,
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating group:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

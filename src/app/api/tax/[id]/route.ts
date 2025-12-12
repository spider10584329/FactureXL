import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tax = await prisma.tax.findUnique({
      where: { id: params.id },
    });

    if (!tax) {
      return NextResponse.json({ error: "Tax not found" }, { status: 404 });
    }

    return NextResponse.json(tax);
  } catch (error) {
    console.error("Error fetching tax:", error);
    return NextResponse.json({ error: "Failed to fetch tax" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, percent } = body;

    const tax = await prisma.tax.update({
      where: { id: params.id },
      data: {
        name,
        percent: percent !== undefined ? parseFloat(percent) : undefined,
      },
    });

    return NextResponse.json(tax);
  } catch (error) {
    console.error("Error updating tax:", error);
    return NextResponse.json({ error: "Failed to update tax" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.tax.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tax:", error);
    return NextResponse.json({ error: "Failed to delete tax" }, { status: 500 });
  }
}

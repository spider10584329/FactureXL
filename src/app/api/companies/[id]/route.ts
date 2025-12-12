import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/companies/[id] - Get company by ID (SUPER_ADMIN only)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const company = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error fetching company:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/companies/[id] - Update company (SUPER_ADMIN only)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await request.json();

    // Check if company exists
    const existingCompany = await prisma.company.findUnique({
      where: { id: params.id },
    });

    if (!existingCompany) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Validate required fields
    if (!data.name) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }

    const company = await prisma.company.update({
      where: { id: params.id },
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        codePostal: data.codePostal || null,
        description: data.description || null,
        bank: data.bank || null,
        account: data.account || null,
        iban: data.iban || null,
      },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error updating company:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/companies/[id] - Delete company (SUPER_ADMIN only)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if company exists
    const existingCompany = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!existingCompany) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Prevent deletion if company has users
    if (existingCompany._count.users > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete company with existing users. Please reassign or delete users first.",
        },
        { status: 400 }
      );
    }

    await prisma.company.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Company deleted successfully" });
  } catch (error) {
    console.error("Error deleting company:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

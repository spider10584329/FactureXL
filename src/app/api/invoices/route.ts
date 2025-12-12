import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generateRef } from "@/lib/utils";

const invoiceItemSchema = z.object({
  internRef: z.string().optional(),
  product: z.string(),
  price: z.number(),
  quantity: z.number(),
  description: z.string().optional(),
  discount: z.number().optional(),
  unite: z.string().optional(),
  tax: z.number().optional(),
  groupId: z.string().optional(),
});

const createInvoiceSchema = z.object({
  ref: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  wording: z.string().optional(),
  type: z.enum(["invoice", "avoir", "devis"]),
  commentary: z.string().optional(),
  subscription: z.boolean().optional(),
  subscriptionMonths: z.array(z.number()).optional(),
  month: z.number().optional(),
  clientId: z.string(),
  employeeId: z.string().optional(),
  items: z.array(invoiceItemSchema),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const archived = searchParams.get("archived");
    const paid = searchParams.get("paid");
    const clientId = searchParams.get("clientId");
    const employeeId = searchParams.get("employeeId");

    const where: any = {};
    if (session.user.companyId) {
      where.companyId = session.user.companyId;
    }
    
    // SECURITY: If user is a CLIENT, only show their own invoices
    if (session.user.role === "CLIENT" && session.user.id) {
      where.clientId = session.user.id;
    }
    
    if (type) where.type = type;
    if (archived !== null) where.archived = archived === "true";
    if (paid !== null) where.paid = paid === "true";
    if (clientId) where.clientId = clientId;
    if (employeeId) where.employeeId = employeeId;

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            code: true,
            address: true,
            phone: true,
          },
        },
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            group: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
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
    const validatedData = createInvoiceSchema.parse(body);

    // Calculate totals
    let totalHT = 0;
    let total = 0;

    validatedData.items.forEach((item) => {
      const itemTotal = item.price * item.quantity * (1 - (item.discount || 0) / 100);
      totalHT += itemTotal;
      total += itemTotal * (1 + (item.tax || 0) / 100);
    });

    const invoice = await prisma.invoice.create({
      data: {
        ref: validatedData.ref || generateRef("INV"),
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        wording: validatedData.wording,
        type: validatedData.type,
        commentary: validatedData.commentary,
        subscription: validatedData.subscription || false,
        subscriptionMonths: validatedData.subscriptionMonths
          ? JSON.stringify(validatedData.subscriptionMonths)
          : null,
        month: validatedData.month,
        clientId: validatedData.clientId,
        employeeId: validatedData.employeeId || session.user.id,
        companyId: session.user.companyId!,
        totalHT,
        total,
        items: {
          create: validatedData.items.map((item) => ({
            internRef: item.internRef,
            product: item.product,
            price: item.price,
            quantity: item.quantity,
            description: item.description,
            discount: item.discount || 0,
            unite: item.unite,
            tax: item.tax || 0,
            groupId: item.groupId,
          })),
        },
      },
      include: {
        client: true,
        employee: true,
        items: {
          include: {
            group: true,
          },
        },
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

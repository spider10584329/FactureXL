import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { invoiceIds } = await request.json();

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json(
        { error: "Invoice IDs are required" },
        { status: 400 }
      );
    }

    // Fetch invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds },
        paid: false, // Only unpaid invoices
      },
      include: {
        client: true,
        company: true,
      },
    });

    if (invoices.length === 0) {
      return NextResponse.json(
        { error: "No valid unpaid invoices found" },
        { status: 404 }
      );
    }

    // Calculate total amount
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Create line items for Stripe
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = invoices.map((invoice) => ({
      price_data: {
        currency: "xpf", // Pacific Franc
        product_data: {
          name: `Facture ${invoice.ref}`,
          description: `Client: ${invoice.client?.name || "N/A"}`,
        },
        unit_amount: Math.round((invoice.total || 0) * 100), // Convert to cents
      },
      quantity: 1,
    }));

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.NEXTAUTH_URL}/invoices?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/invoices?payment=cancelled`,
      metadata: {
        invoiceIds: invoiceIds.join(","),
        userId: session.user.id,
      },
      customer_email: session.user.email || undefined,
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error("Error creating Stripe checkout:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

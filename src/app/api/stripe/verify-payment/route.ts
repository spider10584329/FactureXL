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

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Retrieve the Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

    // Check if this is a test mode payment (for logging/tracking)
    const isTestMode = checkoutSession.livemode === false;
    
    if (isTestMode) {
      console.log("⚠️ Test mode payment detected - updating invoices in test environment");
    }

    // Check if payment was successful
    if (checkoutSession.payment_status === "paid") {
      // Extract invoice IDs from metadata
      const invoiceIds = checkoutSession.metadata?.invoiceIds?.split(",") || [];

      if (invoiceIds.length > 0) {
        // Check if invoices are already marked as paid (webhook might have processed it)
        const invoices = await prisma.invoice.findMany({
          where: {
            id: { in: invoiceIds },
          },
          select: {
            id: true,
            paid: true,
          },
        });

        // Find invoices that are not yet marked as paid
        const unpaidInvoiceIds = invoices
          .filter((inv) => !inv.paid)
          .map((inv) => inv.id);

        // Only update if there are unpaid invoices (avoid duplicate updates)
        if (unpaidInvoiceIds.length > 0) {
          await prisma.invoice.updateMany({
            where: {
              id: { in: unpaidInvoiceIds },
            },
            data: {
              paid: true,
              paymentDate: new Date(),
              lastPaymentMethod: isTestMode 
                ? "Carte (Stripe Test)" 
                : "Carte (Stripe)",
            },
          });

          console.log(
            `✅ Verified and marked ${unpaidInvoiceIds.length} invoices as paid${
              isTestMode ? " (TEST MODE)" : ""
            }`
          );
        } else {
          console.log(
            "ℹ️ All invoices already marked as paid (webhook likely processed them)"
          );
        }
      }

      return NextResponse.json({
        success: true,
        message: "Payment verified and invoices updated",
      });
    } else if (checkoutSession.payment_status === "unpaid") {
      return NextResponse.json({
        success: false,
        message: "Payment not completed",
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `Payment status: ${checkoutSession.payment_status}`,
      });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

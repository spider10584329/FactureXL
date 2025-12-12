import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = headers().get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Check if this is a test mode payment
        const isTestMode = session.livemode === false;
        
        if (isTestMode) {
          console.log("⚠️ Test mode webhook received - processing test payment");
        }

        // Extract invoice IDs from metadata
        const invoiceIds = session.metadata?.invoiceIds?.split(",") || [];

        if (invoiceIds.length > 0) {
          // Mark invoices as paid
          await prisma.invoice.updateMany({
            where: {
              id: { in: invoiceIds },
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
            `✅ Marked ${invoiceIds.length} invoices as paid via Stripe${
              isTestMode ? " (TEST MODE)" : ""
            }`
          );
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error("❌ Payment failed:", paymentIntent.id);
        // Handle failed payment (send notification, etc.)
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("✅ Payment succeeded:", paymentIntent.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

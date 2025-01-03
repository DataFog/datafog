import { stripeClient } from "@/libs/stripe";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { headers } from "next/headers";
import { prismaClient } from "@/prisma/db";

export async function POST(req: NextRequest): Promise<Response> {
  const headersList = headers();
  const stripeSignature = headersList.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

  if (!stripeSignature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 }
    );
  }

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Missing Webhook secret." },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    // Get the raw body for signature verification
    const body = await req.text();
    event = stripeClient.webhooks.constructEvent(
      body,
      stripeSignature,
      webhookSecret
    );
  } catch (error: any) {
    console.error("Webhook signature verification failed:", error.message);
    return NextResponse.json(
      { error: "Webhook signature verification failed." },
      { status: 400 }
    );
  }

  // Handle Stripe events
  switch (event.type) {
    case "payment_intent.succeeded":
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      break;

    case "checkout.session.completed":
      const checkoutSession = event.data.object as Stripe.Checkout.Session;

      break;

    case "payment_intent.payment_failed":
      const failedPaymentIntent = event.data.object as Stripe.PaymentIntent;
      break;

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      const subscription = event.data.object as Stripe.Subscription;

      // get the customer email using the customer id
      const customer = await stripeClient.customers.retrieve(
        subscription.customer as string
      );

      if (!customer || customer.deleted) {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 400 }
        );
      }

      const user = await prismaClient.user.findFirst({
        where: {
          email: customer.email as string,
        },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 400 });
      }

      const stripeProductId = subscription.items.data[0].price
        .product as string;

      const subscriptionPlan = await prismaClient.subscriptionPlan.findFirst({
        where: {
          productId: stripeProductId,
        },
      });

      if (!subscriptionPlan) {
        console.error(
          "Event: customer.subscription.created — Subscription plan not found",
          JSON.stringify(event, null, 2)
        );
        return NextResponse.json(
          { error: "Subscription plan not found" },
          {
            status: 400,
          }
        );
      }

      await prismaClient.userPlan.upsert({
        where: {
          userId: user?.id,
        },
        update: {
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
          stripePriceId: subscription.items.data[0].price.id,
          validUntil: new Date(subscription.current_period_end * 1000),
        },
        create: {
          userId: user?.id,
          planId: subscriptionPlan.id,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
          stripePriceId: subscription.items.data[0].price.id,
          validUntil: new Date(subscription.current_period_end * 1000),
        },
      });
      break;

    case "invoice.paid":
      const invoice = event.data.object as Stripe.Invoice;

      const _subscription = await stripeClient.subscriptions.retrieve(
        invoice.subscription as string
      );
      const userPlan = await prismaClient.userPlan.findFirst({
        where: {
          stripeSubscriptionId: _subscription.id,
        },
      });

      if (!userPlan) {
        console.error(
          "Event: invoice.paid — User plan not found",
          JSON.stringify(event, null, 2)
        );
        return NextResponse.json("User plan not found", { status: 400 });
      }

      await prismaClient.userPlan.update({
        where: {
          id: userPlan.id,
        },
        data: {
          stripePriceId: _subscription.items.data[0].price.id,
          validUntil: new Date(_subscription.current_period_end * 1000),
        },
      });

      break;

    default:
      console.warn(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

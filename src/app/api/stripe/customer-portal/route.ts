import { stripeClient } from "@/libs/stripe";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/config/auth";
import { HttpStatusCode } from "axios";
import { prismaClient } from "@/prisma/db";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: HttpStatusCode.Unauthorized }
    );
  }

  if (session && session?.user?.email) {
    const user = await prismaClient.user.findFirst({
      where: {
        email: session.user.email,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: HttpStatusCode.Unauthorized }
      );
    }

    const userPlan = await prismaClient.userPlan.findFirst({
      where: {
        userId: user?.id,
      },
    });

    if (!userPlan) {
      return NextResponse.json(
        { customerPortalUrl: "" },
        { status: HttpStatusCode.Ok }
      );
    }

    if (!userPlan?.stripeCustomerId) {
      return NextResponse.json(
        { error: "Missing customerId" },
        { status: HttpStatusCode.BadRequest }
      );
    }

    if (userPlan && userPlan?.stripeCustomerId) {
      const customerId = userPlan?.stripeCustomerId;
      try {
        const session = await stripeClient.billingPortal.sessions.create({
          customer: customerId,
          return_url: process.env.WEBSITE_URL, // Redirect users here after they exit the portal
        });

        return NextResponse.json({ url: session.url });
      } catch (error: any) {
        console.error("Error creating customer portal session:", error);
        return NextResponse.json(
          { error: "Failed to create portal session" },
          { status: HttpStatusCode.InternalServerError }
        );
      }
    }
  }

  return NextResponse.json(
    { error: "NotFound" },
    { status: HttpStatusCode.NotFound }
  );
}

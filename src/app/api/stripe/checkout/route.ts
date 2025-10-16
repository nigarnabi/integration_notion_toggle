import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

type Plan = "Amateur" | "Standard" | "Pro";
const priceMap: Record<Plan, string> = {
  Amateur: process.env.PRICE_EUR_1!,
  Standard: process.env.PRICE_EUR_3!,
  Pro: process.env.PRICE_EUR_6!,
};

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { plan } = (await req.json()) as { plan: Plan };
  if (!["Amateur", "Standard", "Pro"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  const priceId = priceMap[plan];
  if (!priceId) {
    return NextResponse.json(
      { error: "Price ID not found for plan" },
      { status: 400 }
    );
  }

  // Check if user already has a Stripe customer ID
  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
    select: { stripeCustomerId: true },
  });
  let customerId = userRecord?.stripeCustomerId;

  // If not, create a new Stripe customer and save the ID
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email || undefined,
      name: user.name || undefined,
      metadata: { appUserId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?stripe=success`;
  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?stripe=cancel`;
  // Create a Stripe Checkout session

  const sessionStripe = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    metadata: { appUserId: user.id, plan },
    subscription_data: { metadata: { appUserId: user.id, plan } },
  });
  return NextResponse.json({ url: sessionStripe.url });
}

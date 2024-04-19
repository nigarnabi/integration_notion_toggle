import DashboardHeader from "./components/Dashboardheader";
import { OnboardingChecklist } from "./components/Onboarding";
import TogglConnectForm from "../api/toggl/components/TogglConnectForm";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) redirect("/");

  // Fetch integration data
  const [notionAccount, userRow] = await Promise.all([
    prisma.account.findFirst({
      where: { userId: user.id, provider: "notion" },
      select: { id: true },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        toggleApiKeyEnc: true,
        togglLastVerifiedAt: true,
        stripeCustomerId: true,
        stripeSubId: true,
        subStatus: true,
      },
    }),
  ]);

  const hasUserId = !!user.id;
  const hasTogglKey = !!userRow?.toggleApiKeyEnc;
  const hasStripeCustomer = !!userRow?.stripeCustomerId;

  return (
    <div
      className="min-h-screen pt-16"
      style={{
        backgroundColor:
          "color-mix(in srgb, var(--color-primary-light-green) 15%, white)",
      }}
    >
      <div className="mx-auto max-w-6xl p-6">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <DashboardHeader />

          {/* Onboarding checklist */}
          <OnboardingChecklist
            hasUserId={hasUserId}
            hasTogglKey={hasTogglKey}
            hasStripeCustomer={hasStripeCustomer}
          />

          <TogglConnectForm />
          {/* <IntegrationStatusCards ... /> */}
          {/* <SyncHealthSection ... /> */}
        </div>
      </div>
    </div>
  );
}

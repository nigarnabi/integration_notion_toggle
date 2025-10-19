import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { redirect } from "next/navigation";

export default async function DashboardHeader() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) redirect("/");

  // fetch notion and user data in parallel
  const [notionAccount, userRow] = await Promise.all([
    prisma.account.findFirst({
      where: { userId: user.id, provider: "notion" },
      select: { id: true },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        name: true,
        email: true,
        image: true,
        toggleApiKeyEnc: true,
        togglLastVerifiedAt: true,
        plan: true,
        stripeCustomerId: true,
        stripeSubId: true,
        subStatus: true,
      },
    }),
  ]);

  if (!userRow) redirect("/");

  // derive statuses
  const notionConnected = !!notionAccount;
  const togglConnected = !!userRow.toggleApiKeyEnc;
  const togglVerified = !!userRow.togglLastVerifiedAt;
  const stripeConnected = !!userRow.stripeCustomerId;
  const planName = userRow.plan ?? "Amateur";
  const isTrial = userRow.subStatus === "trialing";
  const hasSubscription = !!userRow.stripeSubId;

  // disable Sync Now if no Stripe subscription yet
  const canSync =
    notionConnected && togglConnected && togglVerified && hasSubscription;

  return (
    <div
      className="rounded-2xl p-6 shadow-sm"
      style={{
        backgroundColor:
          "color-mix(in srgb, var(--color-primary-light-green) 25%, white)",
        color: "var(--color-primary-deep-brown)",
      }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left side: User info */}
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage
              src={userRow.image ?? undefined}
              alt={userRow.name ?? ""}
            />
            <AvatarFallback
              style={{
                backgroundColor: "var(--color-primary-sage)",
                color: "var(--color-primary-deep-brown)",
              }}
            >
              {(userRow.name ?? userRow.email ?? "U")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div>
            <h1 className="text-xl font-semibold leading-tight">
              Welcome{userRow.name ? `, ${userRow.name.split(" ")[0]}` : ""} 👋
            </h1>
            {userRow.email && (
              <p className="text-sm leading-tight" style={{ opacity: 0.7 }}>
                {userRow.email}
              </p>
            )}
          </div>
        </div>

        {/* Right side: Plan + Sync */}
        <div className="flex items-center gap-3">
          <Badge
            variant="secondary"
            className="rounded-full px-3 py-1"
            style={{
              backgroundColor: isTrial
                ? "color-mix(in srgb, var(--color-primary-sage) 20%, white)"
                : "color-mix(in srgb, var(--color-primary-golden) 20%, white)",
              color: "var(--color-primary-deep-brown)",
              border: "none",
            }}
          >
            {planName}
            {isTrial && <span className="ml-1">· trial</span>}
            {!hasSubscription && <span className="ml-1">· free</span>}
          </Badge>

          <form action="/api/sync" method="post">
            <Button
              variant="ghost"
              size="sm"
              disabled={!canSync}
              style={{
                color: "var(--color-primary-deep-brown)",
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync now
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

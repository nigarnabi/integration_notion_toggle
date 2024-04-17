import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TogglConnectForm from "../api/toggl/components/TogglConnectForm";

export default async function Dashboard() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) redirect("/");

  const [notionAccount, userRow] = await Promise.all([
    prisma.account.findFirst({
      where: { userId: user.id, provider: "notion" },
      select: { id: true },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { toggleApiKeyEnc: true, togglLastVerifiedAt: true },
    }),
  ]);

  const togglConnected = !!userRow?.toggleApiKeyEnc;

  return (
    <main className="min-h-[calc(100vh-56px)] px-6 py-8 bg-[var(--color-primary-light-green)]/15">
      <div className="mx-auto max-w-3xl space-y-8 font-[var(--font-primary)]">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name ?? "User"}
                width={44}
                height={44}
                className="rounded-full ring-2 ring-[var(--color-primary-golden)]/50"
              />
            ) : (
              <div className="h-11 w-11 rounded-full bg-[var(--color-primary-sage)]/30" />
            )}
            <div>
              <h1 className="text-xl font-semibold text-[var(--color-primary-deep-brown)]">
                Welcome{user.name ? `, ${user.name}` : ""} 👋
              </h1>
              <p className="text-sm text-[var(--color-primary-sage)]">
                {user.email ?? "No email"}
              </p>
            </div>
          </div>

          {/* Sign out (server action) */}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              className="rounded-full px-4 py-2 text-sm border
                         border-[var(--color-primary-golden)]
                         text-[var(--color-primary-deep-brown)]
                         hover:bg-[var(--color-primary-golden)] hover:text-white transition"
            >
              Sign out
            </button>
          </form>
        </header>

        {/* Status cards */}
        <section className="grid gap-4 sm:grid-cols-3">
          <StatusCard
            label="Notion"
            ok={!!notionAccount}
            okText="Connected"
            notOkText="Not connected"
          />
          <StatusCard
            label="Toggl"
            ok={togglConnected}
            okText="Connected"
            notOkText="Not connected"
          />
          <StatusCard label="Stripe" ok={false} />
        </section>

        {/* Get started */}
        <section className="rounded-2xl border bg-white/70 backdrop-blur p-5">
          <h2 className="text-lg font-medium text-[var(--color-primary-deep-brown)]">
            Get started
          </h2>
          <p className="mt-1 text-sm text-[var(--color-primary-sage)]">
            Connect Toggl, pick your Notion projects, then choose a plan.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/onboarding/projects"
              className="rounded-full px-4 py-2 text-sm font-medium
                         bg-[var(--color-primary-brick-red)] text-white
                         hover:opacity-90"
            >
              Choose Projects →
            </Link>
            <Link
              href="/onboarding/toggl"
              className="rounded-full px-4 py-2 text-sm border
                         border-[var(--color-primary-deep-brown)]
                         text-[var(--color-primary-deep-brown)]
                         hover:bg-[var(--color-primary-deep-brown)] hover:text-white transition"
            >
              Connect Toggl
            </Link>
            <Link
              href="/api/stripe"
              className="rounded-full px-4 py-2 text-sm border
                         border-[var(--color-primary-golden)]
                         text-[var(--color-primary-golden)]
                         hover:bg-[var(--color-primary-golden)] hover:text-white transition"
            >
              Choose Plan
            </Link>
          </div>
        </section>

        {/* Toggl connect block */}
        <section className="rounded-2xl border bg-white/70 backdrop-blur p-5">
          <h2 className="text-lg font-medium text-[var(--color-primary-deep-brown)]">
            Toggl
          </h2>
          <p className="text-sm text-[var(--color-primary-sage)] mb-3">
            {togglConnected
              ? `Connected ✅${
                  userRow?.togglLastVerifiedAt
                    ? ` • verified ${new Date(
                        userRow.togglLastVerifiedAt
                      ).toLocaleString()}`
                    : ""
                }`
              : "Not connected"}
          </p>
          {!togglConnected && <TogglConnectForm />}
        </section>
      </div>
    </main>
  );
}

function StatusCard({
  label,
  ok,
  okText = "Connected",
  notOkText = "Not connected",
}: {
  label: string;
  ok: boolean;
  okText?: string;
  notOkText?: string;
}) {
  return (
    <div className="rounded-2xl border bg-white/70 backdrop-blur p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium text-[var(--color-primary-deep-brown)]">
          {label}
        </span>
        <span
          className={[
            "text-xs px-2.5 py-1 rounded-full",
            ok
              ? "bg-[var(--color-primary-light-green)]/60 text-[var(--color-primary-deep-brown)]"
              : "bg-[var(--color-primary-brick-red)]/15 text-[var(--color-primary-brick-red)]",
          ].join(" ")}
        >
          {ok ? okText : notOkText}
        </span>
      </div>
    </div>
  );
}

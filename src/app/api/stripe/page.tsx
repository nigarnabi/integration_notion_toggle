"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type Plan = "Amateur" | "Standard" | "Pro";

export default function PricingCTA() {
  const [loading, setLoading] = useState<Plan | null>(null);

  async function startCheckout(plan: Plan) {
    try {
      setLoading(plan);
      const r = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await r.json();
      if (data?.url) window.location.href = data.url;
      else alert(data?.error || "Failed to start checkout");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card className="border rounded-2xl bg-white/80 backdrop-blur font-[var(--font-primary)]">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-semibold text-[var(--color-primary-deep-brown)]">
          Start today
        </CardTitle>
        <p className="mt-1 text-sm text-[var(--color-primary-sage)]">
          Pick a plan and finish in under a minute.
        </p>
      </CardHeader>

      <CardContent className="flex flex-wrap items-center justify-center gap-3">
        <PlanButton
          label="Amateur · €1/mo"
          onClick={() => startCheckout("Amateur")}
          loading={loading === "Amateur"}
        />
        <PlanButton
          label="Standard · €3/mo"
          onClick={() => startCheckout("Standard")}
          loading={loading === "Standard"}
        />
        <PlanButton
          label="Pro · €6/mo"
          onClick={() => startCheckout("Pro")}
          loading={loading === "Pro"}
          featured
        />
      </CardContent>
    </Card>
  );
}

function PlanButton({
  label,
  onClick,
  loading,
  featured = false,
}: {
  label: string;
  onClick: () => void;
  loading?: boolean;
  featured?: boolean;
}) {
  if (featured) {
    // Filled primary style
    return (
      <Button
        onClick={onClick}
        disabled={loading}
        aria-busy={loading}
        className="rounded-full px-5 py-2 text-sm font-medium
                   bg-[var(--color-primary-deep-brown)] text-white
                   hover:opacity-90 transition"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing…
          </span>
        ) : (
          label
        )}
      </Button>
    );
  }

  // Outline style matching your palette
  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
      className="rounded-full px-5 py-2 text-sm font-medium
                 border-[var(--color-primary-deep-brown)]
                 text-[var(--color-primary-deep-brown)]
                 hover:bg-[var(--color-primary-deep-brown)] hover:text-white transition"
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing…
        </span>
      ) : (
        label
      )}
    </Button>
  );
}

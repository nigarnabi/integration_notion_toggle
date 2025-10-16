"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

type Plan = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Amateur",
    price: "$1",
    period: "/month",
    description: "Perfect for individuals getting started",
    features: [
      "Up to 3 Notion workspaces",
      "Basic time tracking",
      "Weekly reports",
      "Email support",
    ],
  },
  {
    name: "Standard",
    price: "$3",
    period: "/month",
    description: "For professionals who need more",
    features: [
      "Unlimited Notion workspaces",
      "Advanced time tracking",
      "Real-time sync",
      "Daily reports & insights",
      "Priority support",
      "Custom integrations",
    ],
    highlighted: true,
  },
  {
    name: "Pro",
    price: "$6",
    period: "/month",
    description: "For teams that demand the best",
    features: [
      "Everything in Standard",
      "Team collaboration",
      "Advanced analytics",
      "API access",
      "Dedicated account manager",
      "Custom onboarding",
    ],
  },
];

export function PricingSection() {
  const [isVisible, setIsVisible] = React.useState(false);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const sectionRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener?.("change", onChange);

    if (mq.matches) {
      setIsVisible(true);
      return () => mq.removeEventListener?.("change", onChange);
    }

    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setIsVisible(true),
      { threshold: 0.1 }
    );

    const el = sectionRef.current;
    if (el) observer.observe(el);

    return () => {
      observer.disconnect();
      mq.removeEventListener?.("change", onChange);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="pricing"
      aria-labelledby="pricing-title"
      className="bg-white px-4 py-24 md:py-32"
    >
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header
          className={[
            "mb-16 text-center transition-all duration-700",
            isVisible || reducedMotion
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8",
          ].join(" ")}
        >
          <h2
            id="pricing-title"
            className="text-balance text-3xl md:text-5xl font-bold text-[var(--color-primary-deep-brown)] mb-4"
          >
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-[color:var(--color-primary-deep-brown)/0.7] max-w-2xl mx-auto text-pretty">
            Choose the plan that fits your workflow. All plans include a 14-day
            free trial.
          </p>
        </header>

        {/* Plans */}
        <ul className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3" role="list">
          {PLANS.map((plan, i) => {
            const isHot = Boolean(plan.highlighted);
            return (
              <li key={plan.name} className="flex">
                <article
                  aria-labelledby={`plan-${i}-title`}
                  className={[
                    "relative flex flex-1 flex-col rounded-2xl border p-8 transition-all duration-700",
                    isHot
                      ? "bg-gradient-to-br from-[color:var(--color-primary-sage)/0.1] to-[color:var(--color-primary-light-green)/0.1] border-[var(--color-primary-sage)] shadow-xl md:scale-[1.03]"
                      : "bg-white border-[color:var(--color-primary-sage)/0.2] hover:border-[color:var(--color-primary-sage)/0.4] hover:shadow-lg",
                    isVisible || reducedMotion
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-8",
                  ].join(" ")}
                  style={
                    reducedMotion
                      ? undefined
                      : { transitionDelay: `${i * 150}ms` }
                  }
                >
                  {isHot && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-primary-golden)] px-4 py-1 text-sm font-medium text-white">
                      Most Popular
                    </div>
                  )}

                  <header className="mb-6">
                    <h3
                      id={`plan-${i}-title`}
                      className="text-2xl font-bold text-[var(--color-primary-deep-brown)] mb-2"
                    >
                      {plan.name}
                    </h3>
                    <p className="text-sm text-[color:var(--color-primary-deep-brown)/0.75] text-pretty">
                      {plan.description}
                    </p>
                  </header>

                  <div className="mb-6">
                    <span className="text-5xl font-bold text-[var(--color-primary-deep-brown)]">
                      {plan.price}
                    </span>
                    <span className="ml-1 align-middle text-[color:var(--color-primary-deep-brown)/0.7]">
                      {plan.period}
                    </span>
                  </div>

                  {/* CTA */}
                  <div className="mb-6">
                    <Button
                      size="lg"
                      asChild
                      className={[
                        "w-full rounded-full",
                        isHot
                          ? "bg-[var(--color-primary-golden)] hover:brightness-95 text-white"
                          : "bg-[color:var(--color-primary-sage)/0.1] hover:bg-[color:var(--color-primary-sage)/0.2] text-[var(--color-primary-deep-brown)]",
                      ].join(" ")}
                      data-plan={plan.name}
                    >
                      <Link
                        href={`/checkout?plan=${encodeURIComponent(plan.name)}`}
                      >
                        Start free trial
                      </Link>
                    </Button>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3" role="list">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check
                          className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--color-primary-sage)]"
                          aria-hidden="true"
                        />
                        <span className="text-sm text-[color:var(--color-primary-deep-brown)/0.8]">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* spacer to keep equal heights if future content added below */}
                  <div className="mt-auto" />
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

"use client";

import * as React from "react";
import { Zap, RefreshCw, BarChart3 } from "lucide-react";

type Feature = {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
};

const FEATURES: Feature[] = [
  {
    icon: RefreshCw,
    title: "Sync your Notion projects with Toggl in one click",
    description:
      "Seamlessly connect your workspaces and keep everything aligned without manual updates.",
  },
  {
    icon: Zap,
    title: "Automated time tracking inside Notion",
    description:
      "Start and stop timers directly from your Notion pages. No context switching required.",
  },
  {
    icon: BarChart3,
    title: "Instant insights across workspaces",
    description:
      "Get unified reports and analytics that bring together data from both platforms.",
  },
];

export function FeaturesSection() {
  const [isVisible, setIsVisible] = React.useState(false);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const sectionRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handleChange = () => setReducedMotion(mq.matches);
    mq.addEventListener?.("change", handleChange);

    if (mq.matches) {
      setIsVisible(true);
      return () => mq.removeEventListener?.("change", handleChange);
    }

    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setIsVisible(true),
      { threshold: 0.1 }
    );
    const el = sectionRef.current;
    if (el) observer.observe(el);

    return () => {
      observer.disconnect();
      mq.removeEventListener?.("change", handleChange);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="features"
      aria-labelledby="features-title"
      className="min-h-screen bg-white px-4 py-24 md:py-32 flex items-center"
    >
      <div className="mx-auto max-w-6xl w-full">
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
            id="features-title"
            className="text-3xl md:text-5xl font-bold text-[var(--color-primary-deep-brown)] text-balance"
          >
            Everything you need to stay in flow
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-[color:var(--color-primary-deep-brown)/0.7] text-pretty">
            Built for freelancers, project managers, and remote teams who value
            their focus.
          </p>
        </header>

        {/* Feature Cards */}
        <ul className="grid md:grid-cols-3 gap-8" role="list">
          {FEATURES.map(({ icon: Icon, title, description }, i) => (
            <li key={title} className="flex">
              <article
                aria-labelledby={`feature-${i}-title`}
                className={[
                  "group flex flex-col flex-1 p-8 rounded-2xl border transition-all duration-500",
                  "bg-gradient-to-br from-[#f8faf7] to-white",
                  "border-[color:var(--color-primary-sage)/0.2]",
                  "hover:border-[color:var(--color-primary-sage)/0.4] hover:shadow-lg",
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
                <div
                  className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl
                             bg-[color:var(--color-primary-sage)/0.1]
                             transition-colors group-hover:bg-[color:var(--color-primary-sage)/0.2]"
                  aria-hidden="true"
                >
                  <Icon className="h-6 w-6 text-[var(--color-primary-sage)]" />
                </div>

                <h3
                  id={`feature-${i}-title`}
                  className="text-xl font-semibold text-[var(--color-primary-deep-brown)] mb-3 text-balance"
                >
                  {title}
                </h3>

                <p className="text-[color:var(--color-primary-deep-brown)/0.75] leading-relaxed text-pretty flex-1">
                  {description}
                </p>

                <div className="mt-auto h-1 w-16 rounded-full bg-[color:var(--color-primary-sage)/0.3] group-hover:bg-[color:var(--color-primary-sage)] transition-colors" />
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

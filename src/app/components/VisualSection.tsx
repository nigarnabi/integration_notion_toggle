"use client";

import * as React from "react";
import { Play } from "lucide-react";

export function VisualSection() {
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
      id="visual"
      aria-labelledby="visual-title"
      className="px-4 py-24 md:py-32 bg-gradient-to-b from-white to-[#f8faf7]"
    >
      <div className="mx-auto max-w-6xl">
        <header
          className={[
            "mb-12 text-center transition-all duration-700",
            isVisible || reducedMotion
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8",
          ].join(" ")}
        >
          <h2
            id="visual-title"
            className="text-3xl md:text-5xl font-bold text-[var(--color-primary-deep-brown)] text-balance mb-4"
          >
            See it in action
          </h2>
          <p className="text-lg text-[color:var(--color-primary-deep-brown)/0.7] max-w-2xl mx-auto text-pretty leading-relaxed">
            Watch how Togotion seamlessly syncs your Notion workspace with Toggl
            time tracking.
          </p>
        </header>

        <figure
          className={[
            "relative transition-all",
            reducedMotion ? "" : "duration-1000",
            isVisible || reducedMotion
              ? "opacity-100 scale-100"
              : "opacity-0 scale-95",
          ].join(" ")}
        >
          {/* Main visual frame */}
          <div className="relative overflow-hidden rounded-2xl shadow-2xl border border-[color:var(--color-primary-sage)/0.3] bg-white">
            <div className="relative aspect-video bg-gradient-to-br from-[color:var(--color-primary-light-green)/0.1] via-white to-[color:var(--color-primary-sage)/0.1] flex items-center justify-center">
              {/* Screenshot */}
              <img
                src="/notion-page-with-toggl-timer-integration-running-c.jpg"
                alt="Togotion dashboard showing a running timer inside a Notion page"
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />

              {/* Play button overlay */}
              <div className="pointer-events-none absolute inset-0 bg-[color:var(--color-primary-deep-brown)/0.05] backdrop-blur-[2px]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  type="button"
                  aria-label="Play product demo"
                  className="group pointer-events-auto inline-flex h-20 w-20 items-center justify-center rounded-full
                             bg-[var(--color-primary-golden)] shadow-xl transition-transform focus:outline-none
                             focus:ring-4 focus:ring-[color:var(--color-primary-golden)/0.4]
                             hover:scale-110"
                  onClick={() => {
                    // hook up to your modal/player later
                    // e.g., setOpen(true)
                  }}
                >
                  <Play className="h-8 w-8 text-white ml-1" fill="white" />
                </button>
              </div>
            </div>
          </div>

          {/* Floating indicators */}
          <figcaption className="sr-only">
            A product screenshot with a play button overlay to watch the demo.
          </figcaption>

          {/* Right floating card */}
          <div
            className="absolute -right-4 top-1/4 hidden lg:block"
            aria-hidden="true"
          >
            <div
              className={[
                "rounded-xl border p-4 bg-white shadow-lg",
                "border-[color:var(--color-primary-sage)/0.2]",
                reducedMotion ? "" : "animate-pulse",
              ].join(" ")}
            >
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-[var(--color-primary-light-green)]" />
                <span className="text-sm font-medium text-[var(--color-primary-deep-brown)]">
                  Syncing...
                </span>
              </div>
            </div>
          </div>

          {/* Left floating card */}
          <div
            className="absolute -left-4 bottom-1/4 hidden lg:block"
            aria-hidden="true"
          >
            <div className="rounded-xl border p-4 bg-white shadow-lg border-[color:var(--color-primary-sage)/0.2]">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-[var(--color-primary-golden)]" />
                <span className="text-sm font-medium text-[var(--color-primary-deep-brown)]">
                  Time tracked
                </span>
              </div>
            </div>
          </div>
        </figure>
      </div>
    </section>
  );
}

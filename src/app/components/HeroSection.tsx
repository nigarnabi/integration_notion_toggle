"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IntegrationIcon } from "./IntegrationIcon";

export function HeroSection() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      className="min-h-screen flex items-center justify-center px-4 py-24 pt-32
                 bg-[var(--color-primary-light-green)]"
    >
      <div className="w-full max-w-7xl mx-auto">
        <div
          className="rounded-3xl shadow-xl border p-8 md:p-12 lg:p-16
                     bg-white/60 backdrop-blur-sm border-white/40"
        >
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <header className="space-y-6 lg:space-y-8">
              <div className="space-y-4">
                <h1
                  id="hero-title"
                  className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-balance
                             text-[var(--color-primary-deep-brown)]"
                >
                  Less switching.
                  <br />
                  More flow.
                </h1>
                <p
                  id="hero-subtitle"
                  className="text-lg md:text-xl leading-relaxed text-pretty
                             text-[color:var(--color-primary-deep-brown)/0.7]"
                >
                  Seamlessly sync projects and track time.
                </p>
              </div>

              {/* Primary actions */}
              <nav
                aria-label="Primary actions"
                className="flex flex-col sm:flex-row gap-4"
              >
                <Button
                  size="lg"
                  asChild
                  className="rounded-full px-8 shadow-lg transition-all
                             bg-[var(--color-primary-brick-red)]
                             hover:bg-[color:var(--color-primary-brick-red)]
                             hover:brightness-95 hover:shadow-xl text-white"
                >
                  <Link
                    href="/api/auth/signin"
                    aria-describedby="hero-subtitle"
                  >
                    Get started
                  </Link>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="rounded-full px-8 transition-all bg-transparent
                             border-2
                             border-[var(--color-primary-deep-brown)]
                             text-[var(--color-primary-deep-brown)]
                             hover:bg-[var(--color-primary-deep-brown)]
                             hover:text-white"
                >
                  <Link href="/pricing" aria-describedby="hero-subtitle">
                    Request demo
                  </Link>
                </Button>
              </nav>
            </header>

            {/* Illustration */}
            <figure className="flex items-center justify-center">
              <div className="w-full max-w-xs lg:max-w-sm">
                <IntegrationIcon />
              </div>
              <figcaption className="sr-only">
                Integration diagram representing syncing between Notion and
                Toggl.
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}

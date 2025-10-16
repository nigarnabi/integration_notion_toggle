"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";

function LogoIcon({
  className = "text-[var(--color-primary-deep-brown)]",
}: {
  className?: string;
}) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Two curved sync arrows forming a circle */}
      <path
        d="M16 4C9.373 4 4 9.373 4 16c0 1.5.275 2.938.777 4.264"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M16 28c6.627 0 12-5.373 12-12 0-1.5-.275-2.938-.777-4.264"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Arrow heads */}
      <path
        d="M4.5 18l-2 2.5 2.5 2"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M27.5 14l2-2.5-2.5-2"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: "#home", label: "Home" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
  { href: "#pricing", label: "Pricing" },
];

export function NavbarClient({ isSignedIn }: { isSignedIn?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50
                 bg-[var(--color-primary-light-green)]/80
                 backdrop-blur-md
                 border-b border-[var(--color-primary-sage)]/20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2">
            <LogoIcon className="text-[var(--color-primary-deep-brown)] group-hover:text-[var(--color-primary-brick-red)] transition-colors" />
            <span className="text-lg font-semibold text-[var(--color-primary-deep-brown)] group-hover:text-[var(--color-primary-brick-red)] transition-colors">
              Togotion
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={[
                  "text-sm font-medium transition-colors",
                  "text-[var(--color-primary-deep-brown)] hover:text-[var(--color-primary-brick-red)]",
                  pathname === href ? "underline underline-offset-4" : "",
                ].join(" ")}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isSignedIn ? (
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  className="border-[var(--color-primary-deep-brown)]
                             text-[var(--color-primary-deep-brown)]
                             hover:bg-[var(--color-primary-deep-brown)]
                             hover:text-white transition-all"
                >
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/api/auth/signin">
                <Button
                  variant="outline"
                  className="border-[var(--color-primary-deep-brown)]
                             text-[var(--color-primary-deep-brown)]
                             hover:bg-[var(--color-primary-deep-brown)]
                             hover:text-white transition-all"
                >
                  Sign in
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu */}
          <MobileMenu isSignedIn={isSignedIn} />
        </div>
      </div>
    </nav>
  );
}
function MobileMenu({ isSignedIn }: { isSignedIn?: boolean }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-[var(--color-primary-deep-brown)] hover:text-white hover:bg-[var(--color-primary-deep-brown)]"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-80 bg-white/95 backdrop-blur-md border-l border-[var(--color-primary-sage)]/30"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-[var(--color-primary-deep-brown)]">
            <LogoIcon />
            <span>Togotion</span>
          </SheetTitle>
        </SheetHeader>

        <nav className="mt-6 flex flex-col gap-3">
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-xl px-3 py-2 text-base font-medium transition-colors
                         text-[var(--color-primary-deep-brown)]
                         hover:bg-[var(--color-primary-light-green)]/40
                         hover:text-[var(--color-primary-brick-red)]"
            >
              {label}
            </Link>
          ))}

          <div className="mt-4">
            {isSignedIn ? (
              <Link href="/dashboard">
                <Button
                  className="w-full border-[var(--color-primary-deep-brown)]
                             text-[var(--color-primary-deep-brown)]
                             hover:bg-[var(--color-primary-deep-brown)]
                             hover:text-white"
                  variant="outline"
                >
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/api/auth/signin">
                <Button
                  className="w-full border-[var(--color-primary-deep-brown)]
                             text-[var(--color-primary-deep-brown)]
                             hover:bg-[var(--color-primary-deep-brown)]
                             hover:text-white"
                  variant="outline"
                >
                  Sign in
                </Button>
              </Link>
            )}
          </div>

          <div className="mt-8 rounded-2xl border border-[var(--color-primary-sage)]/30 p-4">
            <p className="text-sm text-[var(--color-primary-deep-brown)]/80">
              Sync Notion projects with Toggl — less switching, more flow.
            </p>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col bg-primary-light-green/10">
      {/* 🔝 Top bar */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-gray-200 bg-white/70 backdrop-blur-md">
        <h1 className="text-2xl font-bold text-primary-deep-brown font-primary">
          Togotion
        </h1>
        <Button
          asChild
          className="bg-primary-brick-red hover:bg-primary-golden text-white rounded-full px-6 py-2 text-sm font-medium"
        >
          <Link href="/demo">Get a Demo</Link>
        </Button>
      </header>

      {/* 🪄 Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <h1 className="font-primary text-[42px] sm:text-6xl md:text-7xl lg:text-8xl font-semibold leading-tight text-primary-deep-brown">
          Less switching. <br className="hidden sm:block" /> More flow.
        </h1>

        <p className="font-primary mt-6 max-w-3xl mx-auto text-base sm:text-lg md:text-xl text-primary-sage">
          Connect Notion and Toggl effortlessly — sync projects, track time
          automatically, and keep your workflow perfectly aligned.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
          {/* Primary: Pricing */}
          <Button
            asChild
            className="px-8 py-6 rounded-full text-lg bg-primary-brick-red hover:bg-primary-golden text-white"
          >
            <Link href="/pricing">Pricing</Link>
          </Button>

          {/* Secondary: Sign in */}
          <Button
            asChild
            variant="outline"
            className="px-8 py-6 rounded-full text-lg border-2 border-primary-deep-brown text-primary-deep-brown
                     hover:bg-primary-deep-brown hover:text-white"
          >
            <Link href="/api/auth/signin">Sign in</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

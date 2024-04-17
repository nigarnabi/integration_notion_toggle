export function Footer() {
  return (
    <footer
      className="bg-[color:var(--color-primary-light-green)/0.1]
                 border-t border-[color:var(--color-primary-sage)/0.2]
                 py-12 px-4"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand / About */}
          <address
            className="not-italic flex items-center gap-2"
            aria-label="Togotion brand"
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg
                         bg-[var(--color-primary-sage)]"
            >
              <span className="text-sm font-bold text-white">T</span>
            </div>
            <div>
              <p className="font-bold text-[var(--color-primary-deep-brown)]">
                Togotion
              </p>
              <p className="text-xs text-[color:var(--color-primary-deep-brown)/0.7]">
                Made for those who flow between tools.
              </p>
            </div>
          </address>

          {/* Navigation */}
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap items-center justify-center gap-6 text-sm"
          >
            <a
              href="#features"
              className="text-[color:var(--color-primary-deep-brown)/0.7]
                         hover:text-[var(--color-primary-deep-brown)]
                         transition-colors"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-[color:var(--color-primary-deep-brown)/0.7]
                         hover:text-[var(--color-primary-deep-brown)]
                         transition-colors"
            >
              Pricing
            </a>
            <a
              href="#docs"
              className="text-[color:var(--color-primary-deep-brown)/0.7]
                         hover:text-[var(--color-primary-deep-brown)]
                         transition-colors"
            >
              Documentation
            </a>
            <a
              href="#support"
              className="text-[color:var(--color-primary-deep-brown)/0.7]
                         hover:text-[var(--color-primary-deep-brown)]
                         transition-colors"
            >
              Support
            </a>
            <a
              href="#privacy"
              className="text-[color:var(--color-primary-deep-brown)/0.7]
                         hover:text-[var(--color-primary-deep-brown)]
                         transition-colors"
            >
              Privacy
            </a>
          </nav>
        </div>

        {/* Divider + Copyright */}
        <div
          className="mt-8 border-t border-[color:var(--color-primary-sage)/0.2]
                     pt-8 text-center text-sm text-[color:var(--color-primary-deep-brown)/0.6]"
        >
          <p>© {new Date().getFullYear()} Togotion. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

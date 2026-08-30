import { useEffect } from "react";
import { FaXTwitter } from "react-icons/fa6";
import { Link } from "wouter";
import { ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

type FooterLink = {
  label: string;
  href?: string;
  external?: boolean;
  testId?: string;
  onClick?: () => void;
};

const footerGroups: Array<{ title: string; links: FooterLink[] }> = [
  {
    title: "Product",
    links: [
      {
        label: "Explore",
        href: "/explore",
        testId: "link-footer-explore",
      },
      {
        label: "How it works",
        href: "/how-it-works",
        testId: "link-footer-how-it-works",
      },
      {
        label: "Interactive demo",
        href: "/demo-video/",
        external: true,
        testId: "link-footer-demo",
        onClick: () =>
          trackEvent("explore_demo_opened", {
            location: "footer",
            action: "new_tab",
          }),
      },
    ],
  },
  {
    title: "Learn",
    links: [
      { label: "Learn hub", href: "/how-it-works" },
      { label: "Blog" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Docs" },
      { label: "Whitepaper" },
      { label: "Faucet" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Terms of service" },
      { label: "Privacy policy" },
    ],
  },
];

function FooterNavLink({ link }: { link: FooterLink }) {
  const className =
    "group inline-flex items-center gap-1.5 text-sm text-primary-foreground/65 transition-colors hover:text-primary-foreground";

  if (!link.href) {
    return (
      <span
        className="inline-flex cursor-default items-center gap-2 text-sm text-primary-foreground/40"
        aria-disabled="true"
        title="Coming soon"
      >
        {link.label}
        <span className="rounded-full border border-primary-foreground/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/45">
          Soon
        </span>
      </span>
    );
  }

  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        data-testid={link.testId}
        onClick={link.onClick}
      >
        {link.label}
        <ArrowUpRight className="h-3.5 w-3.5 opacity-45 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
      </a>
    );
  }

  return (
    <Link
      href={link.href}
      className={className}
      data-testid={link.testId}
      onClick={link.onClick}
    >
      {link.label}
    </Link>
  );
}

export function SiteFooter() {
  useEffect(() => {
    if (window.location.hash !== "#site-footer") return;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById("site-footer")?.scrollIntoView({
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <footer
      id="site-footer"
      className="relative scroll-mt-8 overflow-hidden border-t border-white/10 bg-primary px-4 py-14 text-primary-foreground sm:py-16"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-seal/70 to-transparent"
        aria-hidden="true"
      />
      <Sparkles
        className="pointer-events-none absolute right-[5%] top-8 h-5 w-5 text-seal sm:right-[9%]"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.45fr_repeat(4,minmax(0,1fr))] lg:gap-8">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight"
              data-testid="link-footer-home"
            >
              <ShieldCheck className="h-5 w-5 text-seal" />
              Envelo
            </Link>

            <h2 className="mt-8 max-w-xs text-3xl font-bold uppercase leading-none tracking-[-0.04em] sm:text-4xl">
              Come say hi
              <span className="ml-2 text-seal">.</span>
            </h2>

            <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/45">
              Connect
            </p>
            <a
              href="https://x.com/enveloarc"
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-3 inline-flex items-center gap-2.5 text-sm font-medium text-primary-foreground/75 transition-colors hover:text-primary-foreground"
              aria-label="Follow Envelo on X"
              data-testid="link-footer-x"
            >
              <FaXTwitter className="h-4 w-4" aria-hidden="true" />
              <span>X / @enveloarc</span>
              <ArrowUpRight className="h-3.5 w-3.5 opacity-45 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
            </a>
          </div>

          {footerGroups.map((group) => (
            <nav key={group.title} aria-label={`${group.title} footer links`}>
              <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-primary-foreground">
                {group.title}
              </h2>
              <div className="mt-4 h-px w-full bg-primary-foreground/10">
                <div className="h-px w-7 bg-seal" />
              </div>
              <ul className="mt-5 space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <FooterNavLink link={link} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-primary-foreground/10 pt-6 text-xs leading-relaxed text-primary-foreground/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Envelo. All rights reserved.</p>
          <p className="max-w-2xl sm:text-right">
            Arc Testnet demonstration only. Test USDC has no real-world value,
            and current settlement records remain public onchain.
          </p>
        </div>
      </div>
    </footer>
  );
}
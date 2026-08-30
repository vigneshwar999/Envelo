import { useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, type LucideIcon } from "lucide-react";
import { SiteFooter } from "@/components/marketing/SiteFooter";

function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export type LegalSection = {
  heading: string;
  body: ReactNode;
};

/**
 * Shared scaffold for public legal pages (/terms, /privacy). Mirrors the
 * How-it-works page language: full-bleed hero with a badge, a plain-language
 * summary card, numbered sections in a readable single column, and the
 * shared marketing footer.
 */
export function LegalPageLayout({
  badgeIcon: BadgeIcon,
  badgeLabel,
  title,
  titleTestId,
  intro,
  lastUpdated,
  summaryTitle = "The short version",
  summaryItems,
  sections,
}: {
  badgeIcon: LucideIcon;
  badgeLabel: string;
  title: string;
  titleTestId: string;
  intro: string;
  lastUpdated: string;
  summaryTitle?: string;
  summaryItems: ReactNode[];
  sections: LegalSection[];
}) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} | Envelo`;
    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  return (
    <div className="w-full bg-background selection:bg-seal selection:text-white">
      {/* HERO */}
      <section className="relative overflow-hidden px-4 pb-16 pt-20 sm:pb-20 sm:pt-24">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_center,var(--tw-gradient-stops))] from-primary/5 via-background to-background" />

        <FadeIn className="mx-auto max-w-3xl space-y-6 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-seal/20 bg-seal/5 px-4 py-1.5 text-sm font-medium uppercase tracking-widest text-seal">
            <BadgeIcon className="h-4 w-4" />
            {badgeLabel}
          </div>
          <h1
            className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
            data-testid={titleTestId}
          >
            {title}
          </h1>
          <p className="text-balance text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {intro}
          </p>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
            Last updated {lastUpdated}
          </p>
        </FadeIn>
      </section>

      {/* SUMMARY CARD */}
      <section className="px-4">
        <FadeIn className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-seal/15 bg-seal/5 p-6 sm:p-8">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-seal">
              {summaryTitle}
            </h2>
            <ul className="mt-5 space-y-4">
              {summaryItems.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-seal"
                    aria-hidden="true"
                  />
                  <span className="text-base leading-relaxed text-foreground">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-seal/10 pt-4 text-sm leading-relaxed text-muted-foreground">
              The summary is here to help; the full text below is what applies.
            </p>
          </div>
        </FadeIn>
      </section>

      {/* SECTIONS */}
      <section className="px-4 pb-24 pt-16 sm:pb-28">
        <div className="mx-auto max-w-3xl space-y-14">
          {sections.map((section, index) => (
            <FadeIn key={section.heading}>
              <article className="space-y-4">
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-sm font-semibold text-seal">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    {section.heading}
                  </h2>
                </div>
                <div className="space-y-4 border-l border-border/70 pl-[calc(1.75rem+2px)] text-base leading-relaxed text-muted-foreground [&_li]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
                  {section.body}
                </div>
              </article>
            </FadeIn>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

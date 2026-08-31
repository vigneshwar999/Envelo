import { useEffect, type ReactNode } from "react";
import { CheckCircle2, type LucideIcon } from "lucide-react";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Background } from "@/components/marketing/Background";
import { ScrollReveal } from "@/components/marketing/ScrollReveal";

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
  afterSections,
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
  afterSections?: ReactNode;
}) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} | Envelo`;
    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  return (
    <div className="w-full bg-transparent selection:bg-primary/30 selection:text-foreground">
      <Background />
      {/* HERO */}
      <section className="relative overflow-hidden px-4 pb-16 pt-20 sm:pb-20 sm:pt-24 z-10">
        <ScrollReveal className="mx-auto max-w-3xl space-y-8 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-foreground backdrop-blur-md">
            <BadgeIcon className="h-4 w-4 text-primary" />
            {badgeLabel}
          </div>
          <h1
            className="text-balance text-5xl font-light tracking-tight text-foreground sm:text-6xl !leading-[1.1]"
            data-testid={titleTestId}
          >
            {title}
          </h1>
          <p className="text-balance text-lg leading-relaxed text-muted-foreground/80 sm:text-xl">
            {intro}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
            Last updated {lastUpdated}
          </p>
        </ScrollReveal>
      </section>

      {/* SUMMARY CARD */}
      <section className="px-4 relative z-10">
        <ScrollReveal className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur-sm">
            <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-6">
              {summaryTitle}
            </h2>
            <ul className="space-y-4">
              {summaryItems.map((item, index) => (
                <li key={index} className="flex items-start gap-4">
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span className="text-base leading-relaxed text-foreground/90">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-8 border-t border-white/5 pt-6 text-sm leading-relaxed text-muted-foreground/60">
              The summary is here to help; the full text below is what applies.
            </p>
          </div>
        </ScrollReveal>
      </section>

      {/* SECTIONS */}
      <section className="px-4 pb-24 pt-20 sm:pb-32 sm:pt-24 relative z-10">
        <div className="mx-auto max-w-3xl space-y-16">
          {sections.map((section, index) => (
            <ScrollReveal key={section.heading}>
              <article className="space-y-6">
                <div className="flex items-baseline gap-6">
                  <span className="font-mono text-sm text-primary/60">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h2 className="text-3xl font-light tracking-tight text-foreground">
                    {section.heading}
                  </h2>
                </div>
                <div className="space-y-4 border-l border-white/10 pl-[calc(1.5rem+10px)] ml-[10px] text-base leading-relaxed text-muted-foreground/80 [&_li]:leading-relaxed [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-3 [&_ul]:pl-5">
                  {section.body}
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {afterSections}

      <SiteFooter />
    </div>
  );
}

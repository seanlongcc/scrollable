import Link from "next/link";

import { SiteLogo } from "@/components/site-logo";

type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  footerParagraphs?: string[];
};

type LegalPageProps = {
  title: string;
  updatedAt: string;
  intro: string[];
  sections: LegalSection[];
};

export function LegalPage({
  title,
  updatedAt,
  intro,
  sections,
}: LegalPageProps) {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <SiteLogo className="-ml-2.5" />
          <nav className="flex gap-3 text-sm text-muted-foreground">
            <Link className="hover:text-foreground" href="/terms">
              Terms
            </Link>
            <Link className="hover:text-foreground" href="/privacy">
              Privacy
            </Link>
          </nav>
        </header>

        <article className="grid gap-7">
          <div className="grid gap-3 border-b border-border pb-6">
            <p className="font-mono text-xs uppercase text-muted-foreground">
              Last updated: {updatedAt}
            </p>
            <h1 className="text-3xl font-semibold tracking-normal sm:text-5xl">
              {title}
            </h1>
            <div className="grid gap-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
              {intro.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>

          {sections.map((section) => (
            <section className="grid gap-3" key={section.title}>
              <h2 className="text-xl font-semibold tracking-normal">
                {section.title}
              </h2>
              {section.paragraphs?.map((paragraph) => (
                <p
                  className="text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7"
                  key={paragraph}
                >
                  {paragraph}
                </p>
              ))}
              {section.bullets ? (
                <ul className="grid gap-2 pl-5 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                  {section.bullets.map((bullet) => (
                    <li className="list-disc" key={bullet}>
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : null}
              {section.footerParagraphs?.map((paragraph) => (
                <p
                  className="text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7"
                  key={paragraph}
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </article>
      </div>
    </main>
  );
}

import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import { HELP_WANTED_LABELS } from "@convex/judgment/taxonomy";
import { type AskFilter, AskFilters, SiteList } from "@/components/site-list";
import { Button } from "@/components/ui/button";
import { WallIllustration } from "@/components/wall-illustration";

const trendingQuery = convexQuery(api.sites.listTrending, {});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(trendingQuery),
  component: HomePage,
});

function HomePage() {
  const { data: sites } = useSuspenseQuery(trendingQuery);
  const [filter, setFilter] = useState<AskFilter>("all");
  const shown = filter === "all" ? sites : sites.filter((s) => s.helpWanted.includes(filter));

  return (
    <>
      <section className="flex flex-col gap-12 pt-8 pb-16 sm:pt-14 lg:flex-row lg:items-start lg:justify-between lg:gap-10 lg:pb-[88px]">
        <div className="flex max-w-[680px] min-w-0 flex-col gap-9">
          <h1 className="type-hero">
            Does your
            <br />
            site sell
            <br />
            <span className="text-primary">you?</span>
          </h1>
          <p className="max-w-[540px] text-lg leading-[30px] sm:text-xl sm:leading-8">
            Pin up your personal site and ask the question you actually care about. Designers,
            engineers and hiring types tell you what they see, what they'd fix, and whether they'd
            call you back.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-4 pt-2">
            <Button asChild>
              <Link to="/submit" className="no-underline hover:text-primary-foreground">
                Pin up your site
              </Link>
            </Button>
            <a href="#on-the-wall" className="text-[17px] leading-6 font-semibold text-foreground">
              Give someone a note first
            </a>
          </div>
        </div>
        <div className="flex justify-center lg:justify-end">
          <WallIllustration />
        </div>
      </section>

      <section id="on-the-wall" aria-labelledby="on-the-wall-title" className="scroll-mt-6">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-6 border-t-3 border-ink pt-10 pb-9">
          <h2 id="on-the-wall-title" className="type-h2 shrink-0">
            On the wall this week
          </h2>
          <AskFilters value={filter} onChange={setFilter} />
        </div>
        <SiteList
          sites={shown}
          empty={
            sites.length === 0 ? (
              <>
                Nothing on the wall yet.{" "}
                <Link to="/submit" className="font-semibold text-foreground">
                  Pin up yours first.
                </Link>
              </>
            ) : (
              <>
                Nobody's asking about {filter === "all" ? "that" : HELP_WANTED_LABELS[filter]} this
                week.{" "}
                <button
                  type="button"
                  className="font-semibold text-foreground underline underline-offset-2 hover:text-primary"
                  onClick={() => setFilter("all")}
                >
                  Show all asks
                </button>
              </>
            )
          }
        />
      </section>
    </>
  );
}

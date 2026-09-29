import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@convex/_generated/api";
import { SiteList } from "@/components/site-list";

const trendingQuery = convexQuery(api.sites.listTrending, {});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(trendingQuery),
  component: TrendingPage,
});

function TrendingPage() {
  const { data: sites } = useSuspenseQuery(trendingQuery);
  return (
    <>
      <section className="py-12">
        <h1 className="max-w-3xl text-5xl leading-[1.05] sm:text-6xl">
          Show the best <span className="text-primary">you</span>.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Post your personal site while you're building it. Find out if it sells you, says where
          you've been, and reads well, from designers, engineers and an instant scorecard.
        </p>
      </section>
      <h2 className="mb-4 text-2xl">Trending, in development</h2>
      <SiteList
        sites={sites}
        empty={
          <>
            No sites yet. <Link to="/submit">Be the first to post yours.</Link>
          </>
        }
      />
    </>
  );
}

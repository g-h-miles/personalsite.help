import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@convex/_generated/api";
import { SiteList } from "@/components/site-list";

const hallOfFameQuery = convexQuery(api.sites.listHallOfFame, {});

export const Route = createFileRoute("/hall-of-fame")({
  loader: ({ context }) => context.queryClient.ensureQueryData(hallOfFameQuery),
  component: HallOfFamePage,
});

function HallOfFamePage() {
  const { data: sites } = useSuspenseQuery(hallOfFameQuery);
  return (
    <>
      <section className="py-12">
        <h1 className="text-5xl">Hall of fame</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Standout finished sites. Every one is domain-verified.
        </p>
      </section>
      <SiteList sites={sites} empty="The hall of fame is empty, for now." />
    </>
  );
}

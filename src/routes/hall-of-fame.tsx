import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@convex/_generated/api";
import { PageIntro } from "@/components/page-intro";
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
      <PageIntro title="Hall of fame">
        Standout finished sites. Every one is domain-verified.
      </PageIntro>
      <SiteList sites={sites} empty="The hall of fame is empty, for now." />
    </>
  );
}

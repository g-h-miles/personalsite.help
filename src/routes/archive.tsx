import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@convex/_generated/api";
import { PageIntro } from "@/components/page-intro";
import { SiteList } from "@/components/site-list";

const graduatedQuery = convexQuery(api.sites.listGraduated, {});

export const Route = createFileRoute("/archive")({
  loader: ({ context }) => context.queryClient.ensureQueryData(graduatedQuery),
  component: ArchivePage,
});

function ArchivePage() {
  const { data: sites } = useSuspenseQuery(graduatedQuery);
  return (
    <>
      <PageIntro title="Graduated">
        Sites that went live, still carrying every note that got them there. Browse them for ideas.
      </PageIntro>
      <SiteList sites={sites} empty="Nobody has graduated yet." />
    </>
  );
}

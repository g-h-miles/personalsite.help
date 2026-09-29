import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@convex/_generated/api";
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
      <section className="py-12">
        <h1 className="text-5xl">Archive</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Graduated sites: live, finished, and still carrying every piece of advice that got them
          there. Browse for ideas.
        </p>
      </section>
      <SiteList sites={sites} empty="Nobody has graduated yet." />
    </>
  );
}

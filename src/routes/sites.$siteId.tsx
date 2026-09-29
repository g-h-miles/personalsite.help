import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { CritiqueForm } from "@/components/critique-form";
import { CritiqueList } from "@/components/critique-list";
import { HelpWantedTags } from "@/components/help-wanted";
import { Person } from "@/components/person";
import { Scorecard } from "@/components/scorecard";
import { Button } from "@/components/ui/button";
import { displayUrl, errorMessage, timeAgo } from "@/lib/format";

const siteQuery = (siteId: Id<"sites">) => convexQuery(api.sites.get, { siteId });

export const Route = createFileRoute("/sites/$siteId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(siteQuery(params.siteId as Id<"sites">)),
  component: SiteProfilePage,
});

function SiteProfilePage() {
  const { siteId } = Route.useParams();
  const { data } = useSuspenseQuery(siteQuery(siteId as Id<"sites">));
  const recordClick = useConvexMutation(api.sites.recordClick);
  const graduate = useMutation({ mutationFn: useConvexMutation(api.sites.graduate) });

  if (!data) {
    return (
      <div className="py-16">
        <h1 className="text-4xl">Site not found</h1>
        <p className="mt-4">
          <Link to="/">Back to trending</Link>
        </p>
      </div>
    );
  }

  const { site, owner, scorecard, critiques, viewer } = data;

  return (
    <>
      {/* The person and their ask lead; the URL is secondary. */}
      <section className="space-y-4 py-12">
        <div className="text-lg">
          <Person person={owner} />
          {site.status !== "in-dev" && (
            <span className="ml-3 bg-tape px-2 py-0.5 text-sm text-white">
              {site.status === "graduated" ? "Graduated" : "Hall of fame"}
            </span>
          )}
        </div>
        <h1 className="text-5xl leading-tight">{site.title}</h1>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Wants help with</p>
          <HelpWantedTags helpWanted={site.helpWanted} />
        </div>
        {site.context && <p className="font-hand text-2xl leading-tight">“{site.context}”</p>}
        {site.audience && (
          <p className="text-muted-foreground">
            Trying to convince: <span className="text-foreground">{site.audience}</span>
          </p>
        )}
        <p className="flex flex-wrap items-baseline gap-x-4 text-sm text-muted-foreground">
          <a
            href={site.url}
            target="_blank"
            rel="noopener"
            onClick={() => void recordClick({ siteId: site._id })}
            className="text-base text-foreground"
          >
            Visit {displayUrl(site.url)} ↗
          </a>
          <span>posted {timeAgo(site.submittedAt)}</span>
          {site.graduatedAt && <span>graduated {timeAgo(site.graduatedAt)}</span>}
        </p>
        {viewer.isOwner && site.status === "in-dev" && (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={graduate.isPending}
              onClick={() => graduate.mutate({ siteId: site._id })}
            >
              It's live: graduate my site
            </Button>
            {graduate.error && (
              <span className="text-sm text-destructive">{errorMessage(graduate.error)}</span>
            )}
          </div>
        )}
      </section>

      {/* Automation and humans, side by side. */}
      <div className="grid gap-12 border-t border-border pt-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section>
          <h2 className="mb-4 text-2xl">Instant scorecard</h2>
          <Scorecard
            scorecard={scorecard}
            status={site.scorecardStatus}
            error={site.scorecardError}
          />
        </section>
        <section className="space-y-10">
          <div>
            <h2 className="mb-4 text-2xl">
              Critiques <span className="text-muted-foreground">{critiques.length}</span>
            </h2>
            <CritiqueList critiques={critiques} signedIn={viewer.signedIn} />
          </div>
          {!viewer.isOwner && site.status === "in-dev" && (
            <div>
              <h2 className="mb-4 text-2xl">Leave a critique</h2>
              <CritiqueForm
                siteId={site._id}
                helpWanted={site.helpWanted}
                signedIn={viewer.signedIn}
              />
            </div>
          )}
        </section>
      </div>
    </>
  );
}

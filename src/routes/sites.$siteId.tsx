import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { CritiqueForm } from "@/components/critique-form";
import { CritiqueList } from "@/components/critique-list";
import { HelpWantedTags } from "@/components/help-wanted";
import { MonoMeta, PersonName } from "@/components/person";
import { BrowserFrame, PlaceholderBars, Tape } from "@/components/pinned-site";
import { Scorecard } from "@/components/scorecard";
import { Button } from "@/components/ui/button";
import { askQuestion, asksLine, firstName, quoted } from "@/lib/ask";
import { daysSince, displayUrl, errorMessage } from "@/lib/format";

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
      <div className="py-16 sm:py-24">
        <h1 className="type-h1">That site isn't on the wall.</h1>
        <p className="mt-6 text-xl leading-8">
          <Link to="/" className="font-semibold">
            Back to the wall
          </Link>
        </p>
      </div>
    );
  }

  const { site, owner, scorecard, critiques, viewer } = data;
  const name = firstName(owner?.displayName);
  const domain = displayUrl(site.url);
  const status =
    site.status === "in-dev"
      ? `in dev · ${daysSince(site.submittedAt)} up`
      : `${site.status === "graduated" ? "graduated" : "hall of fame"}${
          site.graduatedAt ? ` · ${daysSince(site.graduatedAt)} ago` : ""
        }`;

  return (
    <>
      {/* The person and their ask lead; the URL is secondary. */}
      <section className="flex flex-col gap-12 pt-6 pb-14 sm:pt-12 lg:flex-row lg:items-start lg:justify-between lg:gap-10 lg:pb-[72px]">
        <div className="flex max-w-[820px] min-w-0 flex-col gap-7">
          <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <PersonName person={owner} className="text-lg leading-[26px]" />
            <MonoMeta>{owner ? asksLine(owner.roles) : "asks"}</MonoMeta>
            {site.status !== "in-dev" && (
              <span className="ml-1 self-center bg-tape px-2.5 py-[3px] text-xs leading-[18px] font-bold text-white">
                {site.status === "graduated" ? "Graduated" : "Hall of fame"}
              </span>
            )}
          </p>
          <h1 className="type-question text-balance">
            {quoted(askQuestion(site.context, site.helpWanted))}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
            <HelpWantedTags helpWanted={site.helpWanted} />
            {site.audience && <MonoMeta className="sm:pl-2">For: {site.audience}</MonoMeta>}
          </div>
          {viewer.isOwner && site.status === "in-dev" && (
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={graduate.isPending}
                onClick={() => graduate.mutate({ siteId: site._id })}
              >
                It's live: graduate my site
              </Button>
              {graduate.error && (
                <span role="alert" className="text-[15px] leading-[22px] text-primary">
                  {errorMessage(graduate.error)}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex w-full max-w-[400px] shrink-0 flex-col gap-5 self-center lg:self-start">
          <div aria-hidden className="relative h-[284px] w-full">
            <BrowserFrame
              domain={domain}
              className="absolute top-6 left-3 h-[260px] w-[calc(100%-36px)] origin-top-left rotate-2 sm:left-5 sm:w-[360px]"
            >
              <p className="font-display text-[34px] leading-9 font-extrabold tracking-[-0.03em]">
                Hi, I'm {name}.
              </p>
              <PlaceholderBars widths={[280, 300, 250, 180]} />
            </BrowserFrame>
            <Tape className="top-2 left-[38%] h-[30px] w-[100px] origin-top-left -rotate-4" />
          </div>
          <div className="flex items-baseline justify-between gap-4 px-3 pt-3 sm:px-6">
            <a
              href={site.url}
              target="_blank"
              rel="noopener"
              onClick={() => void recordClick({ siteId: site._id })}
              className="text-base leading-6 font-bold text-foreground"
            >
              Visit the site ↗<span className="sr-only"> ({domain}, opens in a new tab)</span>
            </a>
            <MonoMeta>{status}</MonoMeta>
          </div>
        </div>
      </section>

      {/* Automation and humans, side by side. */}
      <div className="grid gap-16 border-t-3 border-ink pt-10 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-14 xl:grid-cols-[420px_minmax(0,1fr)] xl:gap-[88px]">
        <div>
          <Scorecard
            scorecard={scorecard}
            status={site.scorecardStatus}
            error={site.scorecardError}
            submittedAt={site.submittedAt}
          />
        </div>
        <div className="flex min-w-0 flex-col">
          <CritiqueList critiques={critiques} signedIn={viewer.signedIn} />
          {!viewer.isOwner && site.status === "in-dev" && (
            <CritiqueForm
              siteId={site._id}
              ownerFirstName={name}
              helpWanted={site.helpWanted}
              signedIn={viewer.signedIn}
            />
          )}
        </div>
      </div>
    </>
  );
}

import type { FunctionReturnType } from "convex/server";
import { Link } from "@tanstack/react-router";
import type { api } from "@convex/_generated/api";
import { HelpWantedTags } from "@/components/help-wanted";
import { Person } from "@/components/person";
import { displayUrl, formatOverall } from "@/lib/format";

export type SiteSummary = FunctionReturnType<typeof api.sites.listTrending>[number];

/**
 * One row per site. Leads with the person and their ask; the URL is secondary.
 */
export function SiteList({ sites, empty }: { sites: SiteSummary[]; empty: React.ReactNode }) {
  if (sites.length === 0) return <div className="py-12 text-muted-foreground">{empty}</div>;
  return (
    <ol className="divide-y divide-border border-y border-border">
      {sites.map((site, i) => (
        <li key={site._id} className="grid grid-cols-[2.5rem_1fr_auto] gap-x-4 py-5">
          <span className="pt-1 text-sm tabular-nums text-muted-foreground">{i + 1}</span>
          <div className="min-w-0 space-y-2">
            <div className="text-lg">
              <Person person={site.owner} />
            </div>
            <HelpWantedTags helpWanted={site.helpWanted} />
            {site.context && (
              <p className="font-hand text-xl leading-tight text-foreground">“{site.context}”</p>
            )}
            <div className="flex flex-wrap items-baseline gap-x-3 text-sm text-muted-foreground">
              <Link to="/sites/$siteId" params={{ siteId: site._id }} className="text-foreground">
                {site.title}
              </Link>
              <span className="truncate">{displayUrl(site.url)}</span>
            </div>
          </div>
          <div className="text-right text-sm tabular-nums text-muted-foreground">
            <div>
              <span className="text-base font-semibold text-foreground">
                {formatOverall(site.overall)}
              </span>{" "}
              score
            </div>
            <div>
              {site.critiqueCount} critique{site.critiqueCount === 1 ? "" : "s"}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

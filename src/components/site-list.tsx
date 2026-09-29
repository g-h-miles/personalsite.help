import type { FunctionReturnType } from "convex/server";
import { Link } from "@tanstack/react-router";
import type { api } from "@convex/_generated/api";
import { HELP_WANTED, HELP_WANTED_LABELS, type HelpWanted } from "@convex/judgment/taxonomy";
import { HelpWantedTag } from "@/components/help-wanted";
import { MonoMeta, PersonName } from "@/components/person";
import { askQuestion, asksLine, quoted } from "@/lib/ask";
import { displayUrl } from "@/lib/format";
import { cn } from "@/lib/utils";

export type SiteSummary = FunctionReturnType<typeof api.sites.listTrending>[number];

/**
 * The wall: one row per site, separated by 2px ink rules. Leads with the
 * person and their question; the URL is secondary.
 */
export function SiteList({ sites, empty }: { sites: SiteSummary[]; empty: React.ReactNode }) {
  if (sites.length === 0) {
    return (
      <div className="border-y-2 border-ink py-12 text-lg leading-7 text-ink-secondary">
        {empty}
      </div>
    );
  }
  return (
    <ol className="border-b-2 border-ink">
      {sites.map((site) => (
        <AskRow key={site._id} site={site} />
      ))}
    </ol>
  );
}

function AskRow({ site }: { site: SiteSummary }) {
  const question = askQuestion(site.context, site.helpWanted);
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-4 border-t-2 border-ink py-6 sm:py-8 lg:grid-cols-[260px_minmax(0,1fr)_140px] lg:gap-x-0">
      <div className="flex min-w-0 flex-col gap-1 lg:col-start-1 lg:row-start-1 lg:pt-1.5 lg:pr-6">
        <PersonName person={site.owner} linked={false} className="text-[17px] leading-6" />
        <MonoMeta>{site.owner ? asksLine(site.owner.roles) : "asks"}</MonoMeta>
      </div>

      <div className="col-span-2 row-start-2 flex min-w-0 flex-col gap-4 lg:col-span-1 lg:col-start-2 lg:row-start-1">
        <h3 className="type-ask max-w-[760px] text-balance">
          <Link
            to="/sites/$siteId"
            params={{ siteId: site._id }}
            className="text-foreground no-underline decoration-3 underline-offset-4 hover:text-foreground hover:underline"
          >
            {quoted(question)}
          </Link>
        </h3>
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
          {site.helpWanted.map((h) => (
            <HelpWantedTag key={h} focus={h} size="sm" />
          ))}
          <MonoMeta className="truncate">{displayUrl(site.url)}</MonoMeta>
        </div>
      </div>

      <div className="col-start-2 row-start-1 flex flex-col items-end gap-0.5 text-right lg:col-start-3">
        <span className="type-ask tabular-nums">{site.critiqueCount}</span>
        <MonoMeta>{site.critiqueCount === 1 ? "note" : "notes"}</MonoMeta>
      </div>
    </li>
  );
}

export type AskFilter = HelpWanted | "all";

/** "All asks" plus one pill per help-wanted focus. */
export function AskFilters({
  value,
  onChange,
}: {
  value: AskFilter;
  onChange: (next: AskFilter) => void;
}) {
  const options: { value: AskFilter; label: string }[] = [
    { value: "all", label: "All asks" },
    ...HELP_WANTED.map((h) => ({ value: h, label: HELP_WANTED_LABELS[h] })),
  ];
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Filter by what people want help with">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <li key={o.value}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "rounded-full border-2 border-ink px-3 py-1.5 text-sm leading-5 font-semibold transition-colors duration-100 motion-reduce:transition-none",
                active ? "bg-ink text-white" : "bg-background text-ink hover:bg-note",
              )}
            >
              {o.label}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

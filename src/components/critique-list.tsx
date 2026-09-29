import { SignInButton } from "@clerk/react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import { HELP_WANTED_LABELS } from "@convex/judgment/taxonomy";
import { MonoMeta, PersonName } from "@/components/person";
import { quoted, rolesLine } from "@/lib/ask";
import { errorMessage, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

type SiteProfile = NonNullable<FunctionReturnType<typeof api.sites.get>>;
type Critique = SiteProfile["critiques"][number];

/**
 * Notes from people, most helpful first (or newest). Each note answers three
 * prompts: what they think you are after ten seconds, one thing to fix, and
 * what not to lose.
 */
export function CritiqueList({
  critiques,
  signedIn,
}: {
  critiques: Critique[];
  signedIn: boolean;
}) {
  const [sort, setSort] = useState<"helpful" | "newest">("helpful");
  const sorted =
    sort === "helpful" ? critiques : critiques.toSorted((a, b) => b.createdAt - a.createdAt);
  const count = critiques.length;

  return (
    <section aria-labelledby="notes-title" className="flex flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 pb-5">
        <h2 id="notes-title" className="type-h3">
          {count === 0 ? "No notes yet" : `${count} ${count === 1 ? "note" : "notes"} from people`}
        </h2>
        {count > 1 && (
          <button
            type="button"
            onClick={() => setSort(sort === "helpful" ? "newest" : "helpful")}
            className="text-[15px] leading-[22px] font-semibold underline underline-offset-2 hover:text-primary"
          >
            {sort === "helpful" ? "Most helpful first" : "Newest first"}
            <span className="sr-only">. Change sort order.</span>
          </button>
        )}
      </div>
      {count === 0 ? (
        <p className="border-t-2 border-ink pt-6 pb-9 text-base leading-[26px] text-ink-secondary">
          Nobody has left a note yet. Be the first.
        </p>
      ) : (
        <ol>
          {sorted.map((c, i) => (
            <CritiqueItem key={c._id} critique={c} signedIn={signedIn} featured={i === 0} />
          ))}
        </ol>
      )}
    </section>
  );
}

function CritiqueItem({
  critique: c,
  signedIn,
  featured,
}: {
  critique: Critique;
  signedIn: boolean;
  featured: boolean;
}) {
  const toggle = useMutation({ mutationFn: useConvexMutation(api.critiques.toggleUpvote) });
  const meta = [
    c.author && c.author.roles.length > 0 ? rolesLine(c.author.roles) : null,
    timeAgo(c.createdAt),
    c.addresses ? `on ${HELP_WANTED_LABELS[c.addresses].toLowerCase()}` : null,
    c.flagged ? "unreviewed" : null,
  ].filter(Boolean);
  // Older notes carry a separate first impression; new ones write the same answer to both.
  const extraFirstImpression =
    c.firstImpression.trim() !== c.sellsThem.trim() ? c.firstImpression.trim() : null;

  const pill = (
    <button
      type="button"
      aria-pressed={c.viewerHasUpvoted}
      disabled={c.isOwnCritique || toggle.isPending}
      onClick={signedIn ? () => toggle.mutate({ critiqueId: c._id }) : undefined}
      title={
        c.isOwnCritique ? "Your note" : signedIn ? "Mark as helpful" : "Sign in to mark as helpful"
      }
      className={cn(
        "shrink-0 rounded-full border-2 border-ink px-3 py-[5px] text-[13px] leading-[18px] font-bold tabular-nums transition-colors duration-100 disabled:cursor-default motion-reduce:transition-none",
        c.viewerHasUpvoted ? "bg-ink text-white" : "bg-background hover:enabled:bg-note",
      )}
    >
      <span aria-hidden>▲ </span>
      {c.upvoteCount} helpful
    </button>
  );

  return (
    <li className="flex flex-col gap-5 border-t-2 border-ink pt-7 pb-9">
      <div className="flex items-start justify-between gap-4">
        <p className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <PersonName person={c.author} className="text-base leading-6" />
          <MonoMeta>{meta.join(" · ")}</MonoMeta>
        </p>
        {signedIn ? pill : <SignInButton mode="modal">{pill}</SignInButton>}
      </div>
      {toggle.error && (
        <p role="alert" className="text-[15px] leading-[22px] text-primary">
          {errorMessage(toggle.error)}
        </p>
      )}

      <div
        className={cn(
          "flex flex-col gap-1.5 px-5 py-[18px]",
          featured ? "bg-note" : "border-2 border-ink bg-background",
        )}
      >
        <p className="font-mono text-xs leading-4 tracking-[0.04em]">
          AFTER TEN SECONDS, I THINK YOU ARE…
        </p>
        <blockquote className="type-note whitespace-pre-line">{quoted(c.sellsThem)}</blockquote>
        {extraFirstImpression && (
          <p className="pt-1.5 text-[15px] leading-[22px] whitespace-pre-line text-ink-secondary">
            <span className="font-semibold text-ink">First look:</span> {extraFirstImpression}
          </p>
        )}
      </div>

      <dl className="grid gap-6 sm:grid-cols-2 sm:gap-10">
        <div className="flex flex-col gap-1.5">
          <dt className="font-mono text-xs leading-4 font-bold tracking-[0.04em] text-primary">
            ONE THING TO FIX
          </dt>
          <dd className="text-base leading-[26px] whitespace-pre-line">{c.oneThingToFix}</dd>
        </div>
        <div className="flex flex-col gap-1.5">
          <dt className="font-mono text-xs leading-4 font-bold tracking-[0.04em]">DON'T LOSE</dt>
          <dd className="text-base leading-[26px] whitespace-pre-line">{c.whatWorks}</dd>
        </div>
      </dl>
    </li>
  );
}

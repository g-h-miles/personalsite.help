import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";
import { HELP_WANTED_LABELS } from "@convex/judgment/taxonomy";
import { Person } from "@/components/person";
import { Button } from "@/components/ui/button";
import { errorMessage, timeAgo } from "@/lib/format";

type SiteProfile = NonNullable<FunctionReturnType<typeof api.sites.get>>;
type Critique = SiteProfile["critiques"][number];

export function CritiqueList({
  critiques,
  signedIn,
}: {
  critiques: Critique[];
  signedIn: boolean;
}) {
  if (critiques.length === 0) {
    return <p className="text-muted-foreground">No critiques yet. Be the first.</p>;
  }
  return (
    <ol className="divide-y divide-border border-y border-border">
      {critiques.map((c) => (
        <CritiqueItem key={c._id} critique={c} signedIn={signedIn} />
      ))}
    </ol>
  );
}

function CritiqueItem({ critique: c, signedIn }: { critique: Critique; signedIn: boolean }) {
  const toggle = useMutation({ mutationFn: useConvexMutation(api.critiques.toggleUpvote) });
  return (
    <li className="space-y-3 py-5">
      <div className="flex flex-wrap items-baseline gap-x-3 text-sm">
        <Person person={c.author} />
        <span className="text-muted-foreground">{timeAgo(c.createdAt)}</span>
        {c.addresses && (
          <span className="bg-note px-1.5 text-xs">on {HELP_WANTED_LABELS[c.addresses]}</span>
        )}
        {c.flagged && (
          <span
            className="text-xs text-muted-foreground"
            title="Unreviewed: our filter wasn't sure"
          >
            unreviewed
          </span>
        )}
      </div>
      <dl className="space-y-2">
        <Field label="First impression" value={c.firstImpression} />
        <Field label="Does it sell them?" value={c.sellsThem} />
        <Field label="One thing to fix" value={c.oneThingToFix} />
        <Field label="What works" value={c.whatWorks} />
      </dl>
      <div className="flex items-center gap-3 text-sm">
        <Button
          variant={c.viewerHasUpvoted ? "default" : "outline"}
          size="xs"
          disabled={!signedIn || c.isOwnCritique || toggle.isPending}
          onClick={() => toggle.mutate({ critiqueId: c._id })}
          aria-pressed={c.viewerHasUpvoted}
          title={signedIn ? "Helpful" : "Sign in to upvote"}
        >
          ▲ {c.upvoteCount}
        </Button>
        {toggle.error && <span className="text-destructive">{errorMessage(toggle.error)}</span>}
      </div>
    </li>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-line">{value}</dd>
    </div>
  );
}

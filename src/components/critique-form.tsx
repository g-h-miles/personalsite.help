import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { HELP_WANTED_LABELS, type HelpWanted } from "@convex/judgment/taxonomy";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/format";
import { cn } from "@/lib/utils";

const PROMPTS = [
  {
    name: "firstImpression",
    label: "First impression",
    hint: "What do you notice in the first five seconds?",
  },
  {
    name: "sellsThem",
    label: "Does it sell them?",
    hint: "What do you think this person does? Would you hire, follow or contact them?",
  },
  {
    name: "oneThingToFix",
    label: "One thing to fix",
    hint: "The single change that would help most. Be specific.",
  },
  {
    name: "whatWorks",
    label: "What works",
    hint: "What should they keep?",
  },
] as const;

type FieldName = (typeof PROMPTS)[number]["name"];
const EMPTY: Record<FieldName, string> = {
  firstImpression: "",
  sellsThem: "",
  oneThingToFix: "",
  whatWorks: "",
};

/** Structured critique prompts, not an empty comment box. Anonymous allowed. */
export function CritiqueForm({
  siteId,
  helpWanted,
  signedIn,
}: {
  siteId: Id<"sites">;
  helpWanted: readonly HelpWanted[];
  signedIn: boolean;
}) {
  const [fields, setFields] = useState(EMPTY);
  const [addresses, setAddresses] = useState<HelpWanted | undefined>(undefined);
  const submit = useMutation({
    mutationFn: useConvexMutation(api.critiques.submit),
    onSuccess: () => {
      setFields(EMPTY);
      setAddresses(undefined);
    },
  });

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit.mutate({ siteId, addresses, ...fields });
      }}
    >
      {helpWanted.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Which ask are you answering?</legend>
          <div className="flex flex-wrap gap-2">
            {helpWanted.map((h) => (
              <button
                key={h}
                type="button"
                aria-pressed={addresses === h}
                onClick={() => setAddresses(addresses === h ? undefined : h)}
                className={cn(
                  "border px-3 py-1 text-sm",
                  addresses === h
                    ? "border-foreground bg-note"
                    : "border-border text-muted-foreground hover:border-foreground",
                )}
              >
                {HELP_WANTED_LABELS[h]}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {PROMPTS.map((p) => (
        <div key={p.name} className="space-y-1.5">
          <Label htmlFor={p.name}>{p.label}</Label>
          <p className="text-sm text-muted-foreground">{p.hint}</p>
          <Textarea
            id={p.name}
            required
            minLength={3}
            maxLength={2000}
            rows={3}
            value={fields[p.name]}
            onChange={(e) => setFields({ ...fields, [p.name]: e.target.value })}
          />
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={submit.isPending}>
          {submit.isPending ? "Sending…" : "Post critique"}
        </Button>
        {!signedIn && (
          <span className="text-sm text-muted-foreground">
            Posting anonymously. Sign in to build a reputation.
          </span>
        )}
      </div>
      {submit.isSuccess && (
        <p className="font-hand text-xl">Thanks! It'll show up once it clears our filter.</p>
      )}
      {submit.error && <p className="text-sm text-destructive">{errorMessage(submit.error)}</p>}
    </form>
  );
}

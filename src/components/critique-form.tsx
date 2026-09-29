import { SignInButton } from "@clerk/react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { HELP_WANTED_LABELS, type HelpWanted } from "@convex/judgment/taxonomy";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/format";
import { cn } from "@/lib/utils";

const EMPTY = { sellsThem: "", oneThingToFix: "", whatWorks: "" };

const fieldText = "w-full resize-none bg-transparent font-sans outline-none field-sizing-content";

/**
 * "Leave <name> a note": three structured prompts, not an empty comment box.
 * Anonymous allowed.
 *
 * The schema has four prompts; the design asks three. "After ten seconds, I
 * think you are…" answers both `sellsThem` ("what do you think they do?") and
 * `firstImpression`, so it is written to both.
 */
export function CritiqueForm({
  siteId,
  ownerFirstName,
  helpWanted,
  signedIn,
}: {
  siteId: Id<"sites">;
  ownerFirstName: string;
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
  const set = (name: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setFields({ ...fields, [name]: e.target.value });

  return (
    <form
      aria-labelledby="leave-note-title"
      className="flex flex-col gap-6 border-t-3 border-ink pt-9"
      onSubmit={(e) => {
        e.preventDefault();
        submit.mutate({ siteId, addresses, firstImpression: fields.sellsThem, ...fields });
      }}
    >
      <h2 id="leave-note-title" className="type-h3">
        Leave {ownerFirstName} a note
      </h2>

      <label className="flex flex-col gap-2 border-2 border-ink bg-note px-5 py-[18px] has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-tape">
        <span id="note-sellsThem-label" className="font-mono text-xs leading-4 tracking-[0.04em]">
          AFTER TEN SECONDS, I THINK YOU ARE…
        </span>
        <textarea
          name="sellsThem"
          aria-labelledby="note-sellsThem-label"
          required
          minLength={3}
          maxLength={2000}
          value={fields.sellsThem}
          onChange={set("sellsThem")}
          placeholder="Look at the site for ten seconds, then say what you think they do."
          className={cn(fieldText, "min-h-[1lh] text-lg leading-7 placeholder:text-[#5c5420]")}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 border-2 border-ink px-5 py-[18px] has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-tape">
          <span
            id="note-oneThingToFix-label"
            className="font-mono text-xs leading-4 font-bold tracking-[0.04em] text-primary"
          >
            ONE THING TO FIX
          </span>
          <textarea
            name="oneThingToFix"
            aria-labelledby="note-oneThingToFix-label"
            required
            minLength={3}
            maxLength={2000}
            value={fields.oneThingToFix}
            onChange={set("oneThingToFix")}
            placeholder={`If ${ownerFirstName} could only change one thing, what should it be?`}
            className={cn(
              fieldText,
              "min-h-[2lh] text-base leading-[26px] placeholder:text-[#6b6b6b]",
            )}
          />
        </label>
        <label className="flex flex-col gap-2 border-2 border-ink px-5 py-[18px] has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-tape">
          <span
            id="note-whatWorks-label"
            className="font-mono text-xs leading-4 font-bold tracking-[0.04em]"
          >
            DON'T LOSE
          </span>
          <textarea
            name="whatWorks"
            aria-labelledby="note-whatWorks-label"
            required
            minLength={3}
            maxLength={2000}
            value={fields.whatWorks}
            onChange={set("whatWorks")}
            placeholder={`What's working that ${ownerFirstName} should protect?`}
            className={cn(
              fieldText,
              "min-h-[2lh] text-base leading-[26px] placeholder:text-[#6b6b6b]",
            )}
          />
        </label>
      </div>

      {helpWanted.length > 1 && (
        <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <legend className="float-left mr-1 font-mono text-xs leading-4 tracking-[0.04em] text-ink-secondary">
            ANSWERING (OPTIONAL)
          </legend>
          {helpWanted.map((h) => (
            <button
              key={h}
              type="button"
              aria-pressed={addresses === h}
              onClick={() => setAddresses(addresses === h ? undefined : h)}
              className={cn(
                "rounded-full border-2 border-ink px-3 py-1 text-[13px] leading-[18px] font-semibold transition-colors duration-100 motion-reduce:transition-none",
                addresses === h ? "bg-ink text-white" : "bg-background hover:bg-note",
              )}
            >
              {HELP_WANTED_LABELS[h]}
            </button>
          ))}
        </fieldset>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <Button
          type="submit"
          className="self-start px-[26px] text-base"
          disabled={submit.isPending}
        >
          {submit.isPending ? "Sticking…" : "Stick it on"}
        </Button>
        <p className="text-[15px] leading-[22px] text-ink-secondary">
          {signedIn ? (
            "You're signed in, so your name links to your own site."
          ) : (
            <>
              You're posting anonymously.{" "}
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="text-foreground underline underline-offset-2 hover:text-primary"
                >
                  Sign in
                </button>
              </SignInButton>{" "}
              and your name links to your own site.
            </>
          )}
        </p>
      </div>
      <div aria-live="polite">
        {submit.isSuccess && (
          <p className="type-hand -rotate-1 text-primary">
            Stuck on! It'll show up once it clears our filter.
          </p>
        )}
        {submit.error && (
          <p role="alert" className="text-[15px] leading-[22px] font-semibold text-primary">
            {errorMessage(submit.error)}
          </p>
        )}
      </div>
    </form>
  );
}

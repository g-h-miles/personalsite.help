import { SignInButton, useAuth } from "@clerk/react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import { type HelpWanted, ROLE_LABELS, ROLES, type Role } from "@convex/judgment/taxonomy";
import { HelpWantedTags, HelpWantedTiles } from "@/components/help-wanted";
import { Tape } from "@/components/pinned-site";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askQuestion, QUESTION_MAX, quoted } from "@/lib/ask";
import { displayUrl, errorMessage } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/submit")({
  component: SubmitPage,
});

function SubmitPage() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    return (
      <SubmitLayout>
        <Loading />
      </SubmitLayout>
    );
  }
  if (!isSignedIn) {
    return (
      <SubmitLayout preview={<AskPreview {...EXAMPLE_ASK} />}>
        <Callout eyebrow="Before you pin up" title="Sign in first.">
          <p>
            Sign in with Google or GitHub to pin up your site. Your name will link to it everywhere
            you leave a note.
          </p>
          <SignInButton mode="modal">
            <Button className="self-start">Sign in</Button>
          </SignInButton>
        </Callout>
      </SubmitLayout>
    );
  }
  return <SignedInSubmit />;
}

/** Shown in the preview before someone can fill in their own. */
const EXAMPLE_ASK = {
  name: "Nora Okafor",
  question: "Can you tell what I actually do in the first ten seconds?",
  helpWanted: ["selling-myself", "background"],
  audience: "creative directors at small brand studios",
} satisfies React.ComponentProps<typeof AskPreview>;

function Loading() {
  return (
    <p className="font-mono text-[13px] text-ink-secondary motion-safe:animate-pulse">Loading…</p>
  );
}

/** Headline and form on the left; the live sticky-note preview on the right. */
function SubmitLayout({
  children,
  preview,
}: {
  children: React.ReactNode;
  preview?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-14 pt-8 sm:pt-12 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
      <div className="flex max-w-[860px] min-w-0 flex-1 flex-col gap-14">
        <h1 className="type-h1">What do you want help with?</h1>
        {children}
      </div>
      {preview && (
        <div className="flex w-full shrink-0 justify-center lg:sticky lg:top-8 lg:w-[380px]">
          {preview}
        </div>
      )}
    </div>
  );
}

function SignedInSubmit() {
  const eligibility = useQuery(convexQuery(api.sites.submitEligibility, {}));
  const me = useQuery(convexQuery(api.users.me, {}));

  if (!eligibility.data || !me.data) {
    return (
      <SubmitLayout>
        <Loading />
      </SubmitLayout>
    );
  }
  const { given, required, existingSiteId } = eligibility.data;
  const name = me.data.displayName;

  if (existingSiteId) {
    return (
      <SubmitLayout>
        <Callout eyebrow="One site per person" title="Your site is already up.">
          <p>You can only pin up one personal site. Go see what people are saying about it.</p>
          <Button asChild variant="outline" className="self-start">
            <Link
              to="/sites/$siteId"
              params={{ siteId: existingSiteId }}
              className="no-underline hover:text-foreground"
            >
              Go to your site's page
            </Link>
          </Button>
        </Callout>
      </SubmitLayout>
    );
  }

  if (given < required) {
    return (
      <SubmitLayout preview={<AskPreview name={name} helpWanted={["overall"]} />}>
        <Callout eyebrow="Before you pin up" title={`Give ${required} notes first.`} tone="note">
          <p>
            You've given <strong className="font-bold">{given}</strong> of {required}. It keeps
            feedback flowing both ways: the people who help you are the people you helped.
          </p>
          <ol className="flex gap-2" aria-label={`${given} of ${required} notes given`}>
            {Array.from({ length: required }, (_, i) => (
              <li
                key={i}
                className={cn("size-5 border-2 border-ink", i < given ? "bg-ink" : "bg-white")}
              />
            ))}
          </ol>
          <Button asChild variant="outline" className="self-start">
            <Link to="/" hash="on-the-wall" className="no-underline hover:text-foreground">
              Find someone to give a note
            </Link>
          </Button>
        </Callout>
        <ProfileForm initial={me.data} />
      </SubmitLayout>
    );
  }

  return <SiteForm name={name} profile={me.data} />;
}

function SiteForm({
  name,
  profile,
}: {
  name: string;
  profile: { _id: string; displayName: string; roles: Role[] };
}) {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [helpWanted, setHelpWanted] = useState<HelpWanted[]>(["overall"]);
  const [question, setQuestion] = useState("");
  const [audience, setAudience] = useState("");
  const [verificationMethod, setVerificationMethod] = useState<"github-profile" | "badge">("badge");
  const submitSite = useConvexMutation(api.sites.submit);
  const submit = useMutation({
    mutationFn: (args: Parameters<typeof submitSite>[0]) => submitSite(args),
    onSuccess: (siteId) => navigate({ to: "/sites/$siteId", params: { siteId } }),
  });

  return (
    <SubmitLayout
      preview={
        <AskPreview name={name} question={question} helpWanted={helpWanted} audience={audience} />
      }
    >
      <form
        className="flex flex-col gap-14"
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate({
            url,
            // The design has no title field; the domain stands in for it.
            title: displayUrl(url).slice(0, 80) || url,
            helpWanted,
            // The owner's question is stored as the site's free-text context.
            context: question.trim() || undefined,
            audience: audience.trim() || undefined,
            verificationMethod,
          });
        }}
      >
        <Field label="01 · Your site" htmlFor="url">
          <Input
            id="url"
            type="url"
            required
            inputMode="url"
            autoComplete="url"
            placeholder="https://yourname.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="font-mono text-lg sm:text-xl"
          />
        </Field>

        <div className="flex flex-col gap-3.5">
          <p id="help-wanted-label" className="label-mono text-ink-secondary">
            02 · Pick one or more
          </p>
          <HelpWantedTiles
            value={helpWanted}
            onChange={setHelpWanted}
            labelledBy="help-wanted-label"
          />
        </div>

        <Field label="03 · Your question, in your words (optional)" htmlFor="question">
          <div className="flex flex-col gap-3 border-2 border-ink px-5 pt-[18px] pb-4 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-tape">
            <textarea
              id="question"
              rows={1}
              maxLength={QUESTION_MAX}
              aria-describedby="question-count"
              placeholder={askQuestion(undefined, helpWanted)}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="field-sizing-content min-h-[1lh] w-full resize-none bg-transparent text-lg leading-[30px] outline-none placeholder:text-[#6b6b6b] sm:text-xl"
            />
            <p
              id="question-count"
              className={cn(
                "text-right font-mono text-[13px] leading-[18px] tabular-nums",
                question.length >= QUESTION_MAX ? "font-bold text-primary" : "text-ink-secondary",
              )}
            >
              {question.length} / {QUESTION_MAX}
              <span className="sr-only"> characters</span>
            </p>
          </div>
        </Field>

        <Field label="04 · Who are you trying to convince? (optional)" htmlFor="audience">
          <Input
            id="audience"
            maxLength={120}
            placeholder="Creative directors at small studios"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="text-lg sm:text-xl"
          />
        </Field>

        <fieldset className="flex flex-col gap-3.5">
          <legend className="label-mono mb-3.5 text-ink-secondary">
            05 · How should we know it's yours?
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["badge", `I'll add a small "in review" badge to the site`],
                ["github-profile", "It's the website listed on my GitHub profile"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 border-2 border-ink px-5 py-4 text-[15px] leading-[22px] has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-tape",
                  verificationMethod === value ? "bg-note" : "bg-background",
                )}
              >
                <input
                  type="radio"
                  name="verification"
                  className="mt-0.5 size-4 shrink-0 accent-ink"
                  checked={verificationMethod === value}
                  onChange={() => setVerificationMethod(value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <Button type="submit" className="shrink-0 self-start" disabled={submit.isPending}>
              {submit.isPending ? "Pinning…" : "Pin it up"}
            </Button>
            <p className="text-[15px] leading-[22px] text-ink-secondary">
              You get an instant scorecard right away. Notes from people follow.
            </p>
          </div>
          {submit.error && (
            <p role="alert" className="text-[15px] leading-[22px] font-semibold text-primary">
              {errorMessage(submit.error)}
            </p>
          )}
        </div>
      </form>
      <ProfileForm initial={profile} />
    </SubmitLayout>
  );
}

/** Mono numbered label above a field. */
function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      <label htmlFor={htmlFor} className="label-mono text-ink-secondary">
        {label}
      </label>
      {children}
    </div>
  );
}

/** A boxed message in place of the form: sign in, give notes first, already posted. */
function Callout({
  eyebrow,
  title,
  tone = "paper",
  children,
}: {
  eyebrow: string;
  title: string;
  tone?: "paper" | "note";
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-5 border-2 border-ink p-6 text-lg leading-7 shadow-hard-md sm:p-8",
        tone === "note" ? "bg-note" : "bg-background",
      )}
    >
      <p className="label-mono">{eyebrow}</p>
      <h2 className="type-h3">{title}</h2>
      {children}
    </section>
  );
}

/**
 * How the ask will look on the wall: a tilted sticky note with tape, updating
 * as the form changes. Decorative; the form itself carries the content.
 */
function AskPreview({
  name,
  question = "",
  helpWanted,
  audience = "",
}: {
  name: string;
  question?: string;
  helpWanted: readonly HelpWanted[];
  audience?: string;
}) {
  return (
    <div aria-hidden className="relative w-[340px] max-w-full pt-2 pb-8 lg:pt-[150px]">
      <p className="type-hand origin-top-left -rotate-4 pl-1 text-primary">
        how it'll look on the wall ↓
      </p>
      <div className="relative mt-7">
        <div className="flex origin-top-left rotate-3 flex-col gap-[18px] bg-note px-[26px] pt-7 pb-[26px] shadow-note-lg">
          <p className="text-sm leading-5 font-bold">{name} asks</p>
          <p className="font-display text-[30px] leading-[34px] font-extrabold tracking-[-0.03em] text-balance">
            {quoted(askQuestion(question, helpWanted))}
          </p>
          <HelpWantedTags helpWanted={helpWanted} tone="ink" size="xs" />
          {audience.trim() && (
            <p className="font-mono text-xs leading-[18px]">For: {audience.trim()}</p>
          )}
        </div>
        <Tape className="-top-3.5 left-[124px] h-8 w-[110px] origin-top-left -rotate-3" />
      </div>
    </div>
  );
}

/** Display name and role lenses: how you show up next to your ask and your notes. */
function ProfileForm({
  initial,
}: {
  initial: { _id: string; displayName: string; roles: Role[] };
}) {
  return <ProfileFields key={initial._id} initial={initial} />;
}

function ProfileFields({ initial }: { initial: { displayName: string; roles: Role[] } }) {
  const update = useMutation({ mutationFn: useConvexMutation(api.users.updateProfile) });
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [roles, setRoles] = useState<Role[]>(initial.roles);

  const toggleRole = (r: Role) =>
    setRoles((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : prev.length < 2 ? [...prev, r] : prev,
    );

  return (
    <form
      aria-labelledby="about-you-title"
      className="flex flex-col gap-8 border-t-3 border-ink pt-10"
      onSubmit={(e) => {
        e.preventDefault();
        update.mutate({ displayName, roles });
      }}
    >
      <div className="flex flex-col gap-2">
        <h2 id="about-you-title" className="type-h3">
          About you
        </h2>
        <p className="text-[15px] leading-[22px] text-ink-secondary">
          How you show up next to your ask and every note you leave.
        </p>
      </div>
      <Field label="Display name" htmlFor="displayName">
        <Input
          id="displayName"
          value={displayName}
          maxLength={60}
          autoComplete="name"
          onChange={(e) => setDisplayName(e.target.value)}
          className="text-lg"
        />
      </Field>
      <fieldset className="flex flex-col gap-3.5">
        <legend className="label-mono mb-3.5 text-ink-secondary">
          Your lenses (pick up to two)
        </legend>
        <div className="flex flex-wrap gap-2.5">
          {ROLES.map((r) => {
            const on = roles.includes(r);
            return (
              <button
                key={r}
                type="button"
                aria-pressed={on}
                onClick={() => toggleRole(r)}
                className={cn(
                  "rounded-full border-2 border-ink px-4 py-1.5 text-sm leading-5 font-semibold transition-colors duration-100 motion-reduce:transition-none",
                  on ? "bg-ink text-white" : "bg-background hover:bg-note",
                )}
              >
                {ROLE_LABELS[r]}
              </button>
            );
          })}
        </div>
        <p className="text-[15px] leading-[22px] text-ink-secondary">
          Shown next to your name so people know which eyes your feedback comes from.
        </p>
      </fieldset>
      <div className="flex flex-wrap items-center gap-5">
        <Button type="submit" variant="outline" size="sm" disabled={update.isPending}>
          Save
        </Button>
        <div aria-live="polite">
          {update.isSuccess && <span className="type-hand text-primary">Saved.</span>}
          {update.error && (
            <span role="alert" className="text-[15px] leading-[22px] text-primary">
              {errorMessage(update.error)}
            </span>
          )}
        </div>
      </div>
    </form>
  );
}

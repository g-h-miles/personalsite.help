import { Show, SignInButton } from "@clerk/react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import { type HelpWanted, ROLE_LABELS, ROLES, type Role } from "@convex/judgment/taxonomy";
import { HelpWantedPicker } from "@/components/help-wanted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/submit")({
  component: SubmitPage,
});

function SubmitPage() {
  return (
    <>
      <section className="py-12">
        <h1 className="text-5xl">Post your site</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          One personal site per person. Tell people what you want help with, and who the site is
          meant to convince.
        </p>
      </section>
      <Show
        when="signed-in"
        fallback={
          <div className="space-y-4">
            <p>Sign in with Google or GitHub to post your site.</p>
            <SignInButton mode="modal">
              <Button>Sign in</Button>
            </SignInButton>
          </div>
        }
      >
        <SignedInSubmit />
      </Show>
    </>
  );
}

function SignedInSubmit() {
  const eligibility = useQuery(convexQuery(api.sites.submitEligibility, {}));
  if (!eligibility.data) return <p className="text-muted-foreground">Loading…</p>;
  const { given, required, existingSiteId } = eligibility.data;

  if (existingSiteId) {
    return (
      <p>
        You've already posted your site.{" "}
        <Link to="/sites/$siteId" params={{ siteId: existingSiteId }}>
          Go to its page
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="grid gap-12 lg:grid-cols-2">
      <section>
        <h2 className="mb-4 text-2xl">About you</h2>
        <ProfileForm />
      </section>
      <section>
        <h2 className="mb-4 text-2xl">Your site</h2>
        {given < required ? (
          <div className="space-y-2">
            <p>
              Give {required} critiques before posting your own: you've given{" "}
              <span className="font-semibold">{given}</span>.
            </p>
            <p className="text-muted-foreground">
              It keeps feedback flowing both ways. <Link to="/">Find a site to critique</Link>.
            </p>
          </div>
        ) : (
          <SiteForm />
        )}
      </section>
    </div>
  );
}

function ProfileForm() {
  const me = useQuery(convexQuery(api.users.me, {}));
  if (!me.data) return <p className="text-muted-foreground">Loading…</p>;
  return <ProfileFields key={me.data._id} initial={me.data} />;
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
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        update.mutate({ displayName, roles });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          value={displayName}
          maxLength={60}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
      <fieldset>
        <legend className="mb-1 text-sm font-medium">Your lenses (pick up to two)</legend>
        <p className="mb-2 text-sm text-muted-foreground">
          Shown next to your name so people know which eyes your feedback comes from.
        </p>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={roles.includes(r)}
              onClick={() => toggleRole(r)}
              className={cn(
                "border px-3 py-1 text-sm",
                roles.includes(r)
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground",
              )}
            >
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="outline" disabled={update.isPending}>
          Save
        </Button>
        {update.isSuccess && <span className="font-hand text-xl">Saved.</span>}
        {update.error && (
          <span className="text-sm text-destructive">{errorMessage(update.error)}</span>
        )}
      </div>
    </form>
  );
}

function SiteForm() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [helpWanted, setHelpWanted] = useState<HelpWanted[]>(["overall"]);
  const [context, setContext] = useState("");
  const [audience, setAudience] = useState("");
  const [verificationMethod, setVerificationMethod] = useState<"github-profile" | "badge">("badge");
  const submitSite = useConvexMutation(api.sites.submit);
  const submit = useMutation({
    mutationFn: (args: Parameters<typeof submitSite>[0]) => submitSite(args),
    onSuccess: (siteId) => navigate({ to: "/sites/$siteId", params: { siteId } }),
  });

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit.mutate({
          url,
          title,
          helpWanted,
          context: context || undefined,
          audience: audience || undefined,
          verificationMethod,
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="url">URL</Label>
        <Input
          id="url"
          type="url"
          required
          placeholder="https://yourname.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          required
          maxLength={80}
          placeholder="Jane Doe — brand designer"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>What do you want help with?</Label>
        <HelpWantedPicker value={helpWanted} onChange={setHelpWanted} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="context">Context (optional)</Label>
        <Textarea
          id="context"
          maxLength={280}
          rows={2}
          placeholder="I'm applying to brand design roles at small studios"
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
        <p className="text-right text-xs tabular-nums text-muted-foreground">
          {context.length}/280
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="audience">Who should it convince? (optional)</Label>
        <Input
          id="audience"
          maxLength={120}
          placeholder="Hiring managers at design studios"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
        />
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">How should we know it's yours?</legend>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="verification"
            checked={verificationMethod === "badge"}
            onChange={() => setVerificationMethod("badge")}
          />
          <span>I'll add a small "in review" badge to the site</span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="verification"
            checked={verificationMethod === "github-profile"}
            onChange={() => setVerificationMethod("github-profile")}
          />
          <span>It's the website listed on my GitHub profile</span>
        </label>
      </fieldset>
      <Button type="submit" disabled={submit.isPending}>
        {submit.isPending ? "Posting…" : "Post site"}
      </Button>
      {submit.error && <p className="text-sm text-destructive">{errorMessage(submit.error)}</p>}
    </form>
  );
}

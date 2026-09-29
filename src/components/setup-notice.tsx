/** Shown in development when required env vars are missing, instead of a blank crash. */
export function SetupNotice({ missing }: { missing: { convex: boolean; clerk: boolean } }) {
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-4xl">Almost there</h1>
      <p className="mt-4 text-muted-foreground">
        personalsite.help needs a couple of environment variables in <code>.env.local</code>:
      </p>
      <ul className="mt-4 list-disc space-y-2 pl-6">
        {missing.convex && (
          <li>
            <code>VITE_CONVEX_URL</code> — run <code>npx convex dev</code> once; it writes this for
            you.
          </li>
        )}
        {missing.clerk && (
          <li>
            <code>VITE_CLERK_PUBLISHABLE_KEY</code> — from the Clerk dashboard (API keys).
          </li>
        )}
      </ul>
      <p className="mt-4 text-muted-foreground">See README.md → Local development.</p>
    </main>
  );
}

# personalsite.help

Show the best you. Post your personal site while you're building it and find
out whether it sells you, whether it gets your background across, and how the
content, experience and design land. Feedback comes from designers and
developers, plus an instant automated scorecard, and you can browse everyone
else's sites for ideas.

Personal sites only. If it doesn't belong on someone's homepage, it doesn't
belong here.

See [SPEC.md](SPEC.md) for the full product and technical spec.

## Stack

Vite · React · TanStack Router/Query · Convex · Clerk · Tailwind v4 + shadcn/ui · Effect · oxlint/oxfmt · Cloudflare (static)

## Local development

Requirements: Node 22.12+ (CI uses 24) and pnpm 10.

```sh
pnpm install
cp .env.example .env.local   # then fill in VITE_CLERK_PUBLISHABLE_KEY
```

### 1. Convex (needs a Convex login)

```sh
npx convex dev
```

On first run this asks you to log in and create or pick a project. It writes
`CONVEX_DEPLOYMENT` and `VITE_CONVEX_URL` to `.env.local`, pushes the functions,
regenerates `convex/_generated/`, and keeps watching. Leave it running (or use
`pnpm dev:convex`).

### 2. Clerk (needs the Clerk dashboard)

1. Enable the **Google** and **GitHub** social connections only. Turn off
   email/password and passkeys.
2. Turn on the **Convex** integration (Clerk dashboard → Integrations → Convex),
   or create a JWT template named `convex`. Copy the Frontend API URL it shows.
3. Tell Convex about the issuer:

   ```sh
   npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-instance>.clerk.accounts.dev
   ```

4. Put the publishable key in `.env.local` as `VITE_CLERK_PUBLISHABLE_KEY`.

### 3. Run the app

```sh
pnpm dev          # Vite on http://localhost:5173
pnpm seed         # optional: demo people, sites, scorecards and critiques
```

Without `VITE_CONVEX_URL` or `VITE_CLERK_PUBLISHABLE_KEY` the app shows a setup
page instead of crashing.

### Judgment provider (instant scorecard and moderation)

We haven't picked the provider yet. Everything goes through a provider-agnostic
`JudgmentProvider` interface (`convex/judgment/provider.ts`) with three
primitives: choice, yes/no probability, and score. Pick an implementation with a
Convex env var:

```sh
npx convex env set JUDGMENT_PROVIDER mock              # default: deterministic, no key
npx convex env set JUDGMENT_PROVIDER jev               # + JEV_API_KEY   (adapter is a stub)
npx convex env set JUDGMENT_PROVIDER openai-decisions  # + OPENAI_API_KEY (adapter is a stub)
```

The `jev` and `openai-decisions` adapters are stubs for now. They fail with a
typed `ProviderNotConfigured` error, which marks the scorecard as failed and
sends moderation down its fail-safe path.

## Scripts

| Script              | What it does                                        |
| ------------------- | --------------------------------------------------- |
| `pnpm dev`          | Vite dev server                                     |
| `pnpm dev:convex`   | `convex dev` (functions, codegen, watch)            |
| `pnpm build`        | Production build to `dist/`                         |
| `pnpm typecheck`    | `tsc -b` (app, Convex functions, tests)             |
| `pnpm lint`         | oxlint                                              |
| `pnpm format`       | oxfmt (write)                                       |
| `pnpm format:check` | oxfmt (check only)                                  |
| `pnpm test`         | Vitest: unit tests plus Convex function tests (convex-test) |
| `pnpm seed`         | Insert demo data into your dev deployment           |

## Project layout

```
convex/                 backend: schema, queries/mutations/actions, crons
  judgment/             JudgmentProvider (Effect), mock + stub adapters, scorecard, moderation
  lib/                  pure helpers (trending formula, config knobs, URL rules)
src/
  routes/               TanStack file routes: /, /sites/$siteId, /submit, /archive, /hall-of-fame
  components/           plain components; restyle freely (final designs come from Paper)
  index.css             design tokens: colors and fonts, in one place
tests/                  vitest
```

Product knobs still being tested, like the "2 critiques before posting"
reciprocity gate, live in `convex/lib/config.ts`.

## Deploy (owner only)

Hosting is Cloudflare static assets with SPA fallback (`wrangler.jsonc`).

```sh
# Deploys Convex functions to production, then builds the site against the
# production Convex URL. VITE_CLERK_PUBLISHABLE_KEY is read from .env.local.
npx convex deploy --cmd 'pnpm build'
npx wrangler deploy                # needs a Cloudflare login
```

Production Convex needs `CLERK_JWT_ISSUER_DOMAIN` set
(`npx convex env set --prod CLERK_JWT_ISSUER_DOMAIN <issuer url>`).

## License

[MIT](LICENSE)

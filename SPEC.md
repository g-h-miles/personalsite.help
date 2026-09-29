# personalsite.help — Project Spec

A community for **personal websites**, built around one idea: **show the best
you**. People post their personal site to find out whether it sells them,
whether it communicates their background, and how its content, experience and
design land — with feedback from designers and developers, and by browsing
everyone else's for ideas.

This is not a place to show off a finished site. It's a place to ask "does this
site do its job for me?" and get a straight answer.

## The concept

1. **Share in-dev** — Post your personal site while you're building it, and say
   what you want help with (see *Help wanted*).
2. **Get feedback** — Structured critiques from designers/devs, plus instant
   automated audits (see AI section), both pointed at the owner's ask.
3. **Trending** — Sites ranked by attention/clicks, so good work surfaces.
4. **Graduate** — Mark your site live/complete and it moves into a
   discovery/archive section, preserving all past advice as its history.
5. **Hall of fame** — Curated standout finished sites.

Two core value props: **actionable feedback** on whether your site sells you,
and **ideas** from browsing other people's.

### Help wanted

Every submission carries the owner's ask, and the ask leads everywhere the site
appears (the person and what they want come first; the URL is secondary).

- **`helpWanted`** — one or more of:
  - `selling-myself` — does the site make someone want to hire / work with /
    follow me?
  - `background` — does it communicate where I've been: experience, skills,
    history?
  - `content` — is the writing clear, specific, and mine?
  - `experience` — how does it feel to use (navigation, hierarchy,
    accessibility)?
  - `design` — visual craft: hierarchy, typography, polish.
  - `overall` — no particular focus (the default).

  At least one is required on submit; `overall` is the default.
- **`context`** (optional, ≤ 280 chars) — what the owner is going for, e.g.
  "I'm applying to brand design roles at small studios".
- **`audience`** (optional) — who the site is meant to convince.

The ask shapes feedback on both tiers: the instant scorecard weights and orders
its dimensions by `helpWanted`, and critics can say which ask their critique
`addresses`.

### Scope guard

Personal sites only. This must not become another Product Hunt. If it doesn't
belong on someone's homepage, it doesn't belong here.

## AI: two-tier audit system

### Tier 1 — Instant scorecard (fast, cheap, on every submission)

A "System One" judgment model runs a real-time feedback audit the moment a site
is submitted. It returns bounded judgments: declared choices, scores,
probabilities, and confidence signals over extracted DOM/content/style metrics
or outputs from a vision model — **not** raw screenshots directly.

**Provider is undecided.** Candidates:

- **Jev** (TypeSafe AI) — the original plan.
- **OpenAI Decisions API** (built on GPT-6 Luna, announced DevDay 2026, limited
  preview) — may replace Jev and would collapse the stack to a single
  `OPENAI_API_KEY`.

The code talks to a provider-agnostic `JudgmentProvider` interface
(choice / yes-no probability / score) so the provider can be swapped without
touching callers.

- Score dimensions in two groups:
  - **Does it sell you** — clarity of who you are, communicates background,
    memorability / voice, call to action.
  - **Craft** — visual hierarchy, typography, copy quality, accessibility
    basics.
- Dimensions are weighted and ordered by the site's `helpWanted`, so the
  requested focus is shown first (pure, unit-tested weighting function).
- Target: sub-second, fractions of a cent per request.
- Makes the product useful **before the community reaches critical mass**:
  every submission gets an instant structured judgment even with zero human
  critiques.

### Tier 2 — LLM deep audit (slow, prose, on-demand)

A full LLM writes the nuanced critique: *why* the hero isn't working, three
ways to fix it, etc.

- **Chained, not parallel:** the scorecard runs first; its scores tell the LLM
  where to spend its words. Don't burn tokens having the LLM praise a 9/10
  color palette — point it at the 4/10 visual hierarchy.
- **On-demand:** a "request full critique" button, so we're not burning tokens
  on every drive-by submission.

### Tier 3 — Human critiques (taste and context)

Automation supplies instant structured judgments; humans supply taste. Both
live on the site profile side by side.

## Feedback mechanics

- **Structured critique prompts** — not an empty comment box. Prompts:
  *first impression*; *does it sell them / what do you think they do?*;
  *one thing to fix*; *what works*. Prevents "looks clean 🔥" emptiness.
- **Answer the ask** — a critique can optionally say which of the owner's
  `helpWanted` focuses it `addresses`.
- **Critique upvotes** — good feedback floats.
- **Reciprocity (to validate):** give 2 critiques before you can post your own
  site. Keeps the supply/demand balanced.
- **Roles as lenses** — self-selected tags (`designer`, `engineer`,
  `ai-developer`, pick up to two) shown next to the critic's name, so readers
  know *which eyes* the feedback comes from.
- **Anonymous comments allowed** — zero-friction participation. The judgment
  model filters abuse and no-value-add comments (one request per comment:
  *abusive?* *substantive?* *on-topic?* — high-confidence junk held, good stuff
  published instantly, uncertain middle goes live but flaggable). Rate limits
  underneath regardless; the AI is the quality layer, not the only layer.
- Anonymous comments don't build reputation; signed-in critiques do.

## Identity model: your site is your credential

- Every commenter's name links to **their site's page in the community** — you
  can see the critic's taste before deciding how much to trust their critique.
- **Posting a site:** trust-first. Either the URL matches your GitHub profile,
  or you add a small "in review" badge (which doubles as a backlink marketing
  the community — verification as distribution).
- **Full domain verification** (token file / DNS TXT, Bluesky-style) is
  reserved for the hall of fame, where status is actually at stake. Velvet rope
  at the exit, not the entrance.

## Auth

- **Clerk** — app `personalsite.help` (dev instance, Hobby plan).
- Social login: **Google + GitHub only**. No passwords, no passkeys, no X.
- Keys live in `.env.local` (see `.env.example`); never committed.

## Tech stack

- **Frontend:** Vite + TanStack Router + TanStack Query
- **Backend:** Convex (with Clerk auth integration)
- **AI:** TanStack AI; Effect.js for program logic
- **UI:** shadcn/ui — must look **elegant** (this is a design community;
  the site itself is the portfolio piece). Visual tokens (one place,
  `src/index.css`): white `#FFFFFF`, ink `#000000`, accent red `#E8112D`,
  sticky-note yellow `#FFE45C`, tape blue `#2B5BFF`, secondary text
  `#444444`; Bricolage Grotesque 800 (display), Inter (body), Caveat
  (handwritten annotation accents).
- **Design:** source files and prototypes live in Paper
- **Lint/format:** oxlint + oxfmt
- **Hosting:** Cloudflare
- **Domains:** `personalsite.help` (canonical) + `personalsitehelp.com`
  (301 redirect → .help for SEO/habit). Moving registrar/DNS from Vercel to
  Cloudflare.

## Background jobs — Convex, not Cloudflare

All loops live in **Convex's scheduler/cron**, not Cloudflare Workers.
Cloudflare is static hosting + CDN only.

- **On mutation (immediate, Convex actions):**
  - New comment → moderation judgment before publish
  - New site submission → instant scorecard
  - "Request full critique" → LLM deep audit job
- **On cron (Convex scheduled functions):**
  - Trending score recompute
  - Periodic site re-audits (scores decay / content changed)
  - Graduation eligibility checks

Convex + Clerk have a first-class integration — use it, don't hand-roll auth.

## Environment variables

| Key | Where |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | `.env.local` |
| `CLERK_SECRET_KEY` | Convex env / Clerk dashboard |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex env |
| `OPENAI_API_KEY` | Convex env |
| `JEV_API_KEY` | Convex env — only if Jev is the chosen provider |
| `JUDGMENT_PROVIDER` | Convex env — `mock` (default) \| `jev` \| `openai-decisions` |

## Open source

Open source from day one (MIT). The moat is the community and the corpus of
sites/critiques, not the code — a fork without the community is an empty room.
The audience (designers/devs) is exactly the audience that contributes.

## Open questions

- Judgment provider: Jev vs OpenAI Decisions API (access, price, latency, calibration).
- Reciprocity: is "2 critiques to post" the right gate, or too strict for launch?
- Trending algorithm: pure clicks, or time-decayed with critique velocity?
- Hall of fame curation: community vote, maintainer pick, or score threshold?
- Badge design for the "in review" embed.

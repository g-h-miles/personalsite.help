import { BrowserFrame, PlaceholderBars, Tape } from "@/components/pinned-site";

/**
 * The hero's "pinned site": a mock personal site taped to the wall, circled
 * in red pen, with two notes stuck on it. Purely decorative.
 *
 * Drawn at its Paper size (600×560) and scaled as a whole so the composition
 * holds together at every width.
 */
export function WallIllustration() {
  return (
    <div
      aria-hidden
      className="relative h-[308px] w-[330px] shrink-0 select-none sm:h-[448px] sm:w-[480px] lg:h-[392px] lg:w-[420px] xl:h-[560px] xl:w-[600px]"
    >
      <div className="absolute top-0 left-0 h-[560px] w-[600px] origin-top-left scale-[0.55] sm:scale-[0.8] lg:scale-[0.7] xl:scale-100">
        <BrowserFrame
          domain="noraokafor.studio"
          size="lg"
          className="absolute top-9 left-10 h-[420px] w-[500px] origin-top-left -rotate-2"
        >
          <p className="font-display text-5xl leading-[48px] font-extrabold tracking-[-0.03em]">
            Hi, I'm Nora.
          </p>
          <p className="w-[380px] text-base leading-[26px] text-ink-secondary">
            I make things for people and brands I believe in. Currently open to new adventures.
          </p>
          <PlaceholderBars widths={[420, 360, 390, 220]} size="lg" />
        </BrowserFrame>

        <Tape className="top-3.5 left-[230px] h-[34px] w-[120px] origin-top-left rotate-3" />

        {/* Red pen circling the vague intro line. */}
        <svg
          width="440"
          height="96"
          viewBox="0 0 440 96"
          className="absolute top-[166px] left-[46px] origin-top-left -rotate-2"
        >
          <path
            d="M228 6C120 2 14 18 8 50C3 80 120 92 236 90C340 88 432 74 432 44C432 18 330 4 190 10"
            fill="none"
            stroke="var(--ps-red)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>

        <div className="absolute top-[236px] left-[372px] flex w-[230px] origin-top-left rotate-4 flex-col gap-2 bg-note px-[18px] pt-[18px] pb-[22px] shadow-note">
          <p className="type-hand text-ink">Makes what? I still don't know what you do.</p>
          <p className="font-mono text-xs leading-4 tracking-[0.04em] text-ink">TOMÁS · ENGINEER</p>
        </div>

        <div className="absolute top-[400px] left-0 flex w-[220px] origin-top-left -rotate-5 flex-col gap-2 border-2 border-ink bg-white px-[18px] pt-[18px] pb-[22px] shadow-note">
          <p className="type-hand text-primary">The voice is great. Keep it.</p>
          <p className="font-mono text-xs leading-4 tracking-[0.04em] text-ink">
            MEI LING · DESIGNER
          </p>
        </div>
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";

/**
 * The mark: a tilted sticky note with a red question mark whose dot is a heart.
 * Same drawing as public/favicon.svg.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      width="30"
      height="32"
      viewBox="7 7 138 146"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <g transform="rotate(-6 76 80)">
        <rect
          x="18"
          y="18"
          width="116"
          height="124"
          fill="var(--ps-note)"
          stroke="var(--ps-ink)"
          strokeWidth="8"
        />
        <path
          d="M58 60C58 48 66 40 77 40C88 40 96 48 96 58C96 67 90 71 84 76C79 80 77 84 77 92"
          stroke="var(--ps-red)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M77 128C77 128 63 119 63 110C63 105 67 102 71 102C73.5 102 76 103.5 77 106C78 103.5 80.5 102 83 102C87 102 91 105 91 110C91 119 77 128 77 128Z"
          fill="var(--ps-red)"
        />
      </g>
    </svg>
  );
}

/** Mark + "personalsite.help" wordmark. The mark sits 1.5px low to center on the lowercase. */
export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark className="translate-y-[1.5px]" />
      <span className="font-display text-[22px] leading-6 font-extrabold tracking-[-0.02em] text-foreground">
        personalsite.help
      </span>
    </span>
  );
}

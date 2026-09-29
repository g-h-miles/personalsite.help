import { HELP_WANTED, HELP_WANTED_LABELS, type HelpWanted } from "@convex/judgment/taxonomy";
import { HELP_WANTED_DESCRIPTIONS } from "@/lib/ask";
import { cn } from "@/lib/utils";

/** One color treatment per focus, all from the wall's palette (all pass WCAG AA). */
const TAG_STYLES: Record<HelpWanted, string> = {
  "selling-myself": "bg-note text-ink",
  background: "bg-tape text-white",
  content: "bg-ink text-white",
  experience: "bg-rule text-ink",
  design: "bg-background text-ink outline-2 -outline-offset-2 outline-ink",
  overall: "bg-primary text-white",
};

/** A single help-wanted focus as a colored tag. */
export function HelpWantedTag({
  focus,
  size = "md",
  tone = "color",
}: {
  focus: HelpWanted;
  size?: "xs" | "sm" | "md";
  /** "ink" = black tags (used on the yellow sticky-note preview). */
  tone?: "color" | "ink";
}) {
  return (
    <span
      className={cn(
        "inline-flex font-sans font-bold",
        size === "xs" && "px-2.5 py-1 text-xs leading-4",
        size === "sm" && "px-3 py-[5px] text-[13px] leading-[18px]",
        size === "md" && "px-3.5 py-1.5 text-sm leading-5",
        tone === "ink" ? "bg-ink text-white" : TAG_STYLES[focus],
      )}
    >
      {HELP_WANTED_LABELS[focus]}
    </span>
  );
}

/** The person's ask, as tags. */
export function HelpWantedTags({
  helpWanted,
  size,
  tone,
  className,
}: {
  helpWanted: readonly HelpWanted[];
  size?: "xs" | "sm" | "md";
  tone?: "color" | "ink";
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap gap-2", className)} aria-label="Wants help with">
      {helpWanted.map((h) => (
        <li key={h} className="flex">
          <HelpWantedTag focus={h} size={size} tone={tone} />
        </li>
      ))}
    </ul>
  );
}

/**
 * "Pick one or more": six toggle tiles backed by real checkboxes (keyboard and
 * screen-reader friendly). At least one stays selected; clearing the last one
 * falls back to "overall".
 */
export function HelpWantedTiles({
  value,
  onChange,
  labelledBy,
}: {
  value: readonly HelpWanted[];
  onChange: (next: HelpWanted[]) => void;
  labelledBy?: string;
}) {
  const toggle = (h: HelpWanted) => {
    const next = value.includes(h) ? value.filter((x) => x !== h) : [...value, h];
    onChange(next.length ? next : ["overall"]);
  };
  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      {HELP_WANTED.map((h) => {
        const selected = value.includes(h);
        return (
          <label
            key={h}
            className={cn(
              "flex cursor-pointer flex-col gap-2 border-2 border-ink p-4 sm:p-5 transition-[background-color,box-shadow] duration-100 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-tape motion-reduce:transition-none",
              selected ? "bg-note shadow-hard" : "bg-background hover:bg-[#fffbe6]",
            )}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={selected}
              onChange={() => toggle(h)}
              aria-labelledby={`help-${h}-title`}
              aria-describedby={`help-${h}-desc`}
            />
            <span className="flex items-center justify-between gap-3">
              <span id={`help-${h}-title`} className="type-tile">
                {HELP_WANTED_LABELS[h]}
              </span>
              <span aria-hidden className="text-lg leading-6 font-bold">
                {selected ? "✓" : "+"}
              </span>
            </span>
            <span id={`help-${h}-desc`} className="text-[15px] leading-[22px]">
              {HELP_WANTED_DESCRIPTIONS[h]}
            </span>
          </label>
        );
      })}
    </div>
  );
}

/** @deprecated Kept until the submit page moves to HelpWantedTiles. */
export const HelpWantedPicker = HelpWantedTiles;

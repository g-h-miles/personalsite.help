import { HELP_WANTED, HELP_WANTED_LABELS, type HelpWanted } from "@convex/judgment/taxonomy";
import { cn } from "@/lib/utils";

/** The person's ask, as sticky-note tags. */
export function HelpWantedTags({
  helpWanted,
  className,
}: {
  helpWanted: readonly HelpWanted[];
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)} aria-label="Wants help with">
      {helpWanted.map((h) => (
        <li key={h} className="bg-note px-2 py-0.5 text-sm font-medium text-secondary-foreground">
          {HELP_WANTED_LABELS[h]}
        </li>
      ))}
    </ul>
  );
}

/** Multi-select chips. At least one must stay selected. */
export function HelpWantedPicker({
  value,
  onChange,
}: {
  value: readonly HelpWanted[];
  onChange: (next: HelpWanted[]) => void;
}) {
  const toggle = (h: HelpWanted) => {
    const next = value.includes(h) ? value.filter((x) => x !== h) : [...value, h];
    onChange(next.length ? next : ["overall"]);
  };
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="What do you want help with?">
      {HELP_WANTED.map((h) => {
        const selected = value.includes(h);
        return (
          <button
            key={h}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(h)}
            className={cn(
              "border px-3 py-1 text-sm transition-colors",
              selected
                ? "border-foreground bg-note text-secondary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-foreground",
            )}
          >
            {HELP_WANTED_LABELS[h]}
          </button>
        );
      })}
    </div>
  );
}

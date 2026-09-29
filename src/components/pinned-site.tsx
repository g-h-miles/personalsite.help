import { cn } from "@/lib/utils";

/** A strip of painter's tape. Position and rotation come from the caller. */
export function Tape({ className }: { className?: string }) {
  return <div aria-hidden className={cn("absolute bg-tape/90", className)} />;
}

/**
 * A static placeholder for someone's site: a white browser frame with a
 * domain in the bar, a greeting and grey text bars. We never embed the real
 * site; this is a stand-in pinned to the wall.
 */
export function BrowserFrame({
  domain,
  size = "md",
  children,
  className,
}: {
  domain: string;
  size?: "md" | "lg";
  children: React.ReactNode;
  className?: string;
}) {
  const lg = size === "lg";
  return (
    <div
      className={cn(
        "flex flex-col border-2 border-ink bg-white",
        lg ? "shadow-hard-lg" : "shadow-hard-md",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 border-b-2 border-ink",
          lg ? "px-4 py-3" : "px-3.5 py-2.5",
        )}
      >
        <span className={cn("shrink-0 rounded-full bg-ink", lg ? "size-2.5" : "size-[9px]")} />
        <span
          className={cn(
            "shrink-0 rounded-full border-2 border-ink",
            lg ? "size-2.5" : "size-[9px]",
          )}
        />
        <span
          className={cn(
            "min-w-0 truncate font-mono text-ink",
            lg ? "pl-2 text-[13px] leading-4" : "pl-1.5 text-xs leading-4",
          )}
        >
          {domain}
        </span>
      </div>
      <div className={cn("flex flex-col", lg ? "gap-4 px-8 py-9" : "gap-3 px-[22px] py-6")}>
        {children}
      </div>
    </div>
  );
}

/** Grey placeholder text bars (widths in px at full size). */
export function PlaceholderBars({ widths, size = "md" }: { widths: number[]; size?: "md" | "lg" }) {
  return (
    <div className={cn("flex flex-col", size === "lg" ? "gap-2.5 pt-3" : "gap-2 pt-2")}>
      {widths.map((w, i) => (
        <div
          key={i}
          className={cn("max-w-full bg-rule", size === "lg" ? "h-2.5" : "h-2")}
          style={{ width: w }}
        />
      ))}
    </div>
  );
}

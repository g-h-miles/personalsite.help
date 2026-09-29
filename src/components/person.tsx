import type { Role } from "@convex/judgment/taxonomy";
import { Link } from "@tanstack/react-router";
import type { Id } from "@convex/_generated/dataModel";
import { cn } from "@/lib/utils";

export interface PersonInfo {
  _id: Id<"users">;
  displayName: string;
  imageUrl?: string;
  roles: Role[];
  siteId?: Id<"sites">;
}

/**
 * A person's name, linking to their own site's page in the community
 * ("your site is your credential"). Anonymous people get no link.
 */
export function PersonName({
  person,
  className,
  linked = true,
}: {
  person: PersonInfo | null;
  className?: string;
  linked?: boolean;
}) {
  const base = cn("font-sans font-bold text-foreground", className);
  if (!person) return <span className={base}>Anonymous</span>;
  if (linked && person.siteId) {
    return (
      <Link
        to="/sites/$siteId"
        params={{ siteId: person.siteId }}
        className={cn(base, "underline decoration-1 underline-offset-2 hover:text-primary")}
      >
        {person.displayName}
      </Link>
    );
  }
  return <span className={base}>{person.displayName}</span>;
}

/** Mono metadata next to a name: "designer · asks", "engineer · 2 days ago". */
export function MonoMeta({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("font-mono text-[13px] leading-[18px] text-ink-secondary", className)}>
      {children}
    </span>
  );
}

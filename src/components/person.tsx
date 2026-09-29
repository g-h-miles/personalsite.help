import { ROLE_LABELS, type Role } from "@convex/judgment/taxonomy";
import { Link } from "@tanstack/react-router";
import type { Id } from "@convex/_generated/dataModel";

export interface PersonInfo {
  _id: Id<"users">;
  displayName: string;
  imageUrl?: string;
  roles: Role[];
  siteId?: Id<"sites">;
}

/**
 * A person's name, linking to their own site's page in the community
 * ("your site is your credential"), with their role lenses.
 */
export function Person({ person }: { person: PersonInfo | null }) {
  if (!person) return <span className="text-muted-foreground">Anonymous</span>;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      {person.siteId ? (
        <Link to="/sites/$siteId" params={{ siteId: person.siteId }} className="font-medium">
          {person.displayName}
        </Link>
      ) : (
        <span className="font-medium">{person.displayName}</span>
      )}
      {person.roles.length > 0 && (
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {person.roles.map((r) => ROLE_LABELS[r]).join(" · ")}
        </span>
      )}
    </span>
  );
}

import { Show, SignInButton, UserButton } from "@clerk/react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Trending" },
  { to: "/archive", label: "Archive" },
  { to: "/hall-of-fame", label: "Hall of fame" },
] as const;

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4">
        <Link to="/" className="font-display text-2xl text-foreground no-underline">
          personalsite<span className="text-primary">.help</span>
        </Link>
        <nav className="flex gap-5 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-muted-foreground no-underline hover:text-foreground"
              activeProps={{ className: "text-foreground underline" }}
              activeOptions={{ exact: true }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Button asChild size="sm">
            <Link to="/submit" className="no-underline hover:text-primary-foreground">
              Post your site
            </Link>
          </Button>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button variant="outline" size="sm">
                Sign in
              </Button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
}

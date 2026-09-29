import { Show, SignInButton, UserButton } from "@clerk/react";
import { Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/logo";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "On the wall" },
  { to: "/archive", label: "Graduated" },
  { to: "/hall-of-fame", label: "Hall of fame" },
] as const;

const navLink =
  "text-[15px] leading-5 font-medium text-foreground no-underline decoration-2 underline-offset-[6px] hover:text-foreground hover:underline";

export function SiteHeader() {
  return (
    <header className="mx-auto w-full max-w-[1440px] px-4 sm:px-8 xl:px-16">
      {/* Phones: logo + CTA on top, nav + sign-in below. Desktop: one row. DOM order is the desktop order. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 gap-y-4 py-5 [grid-template-areas:'logo_cta_cta'_'nav_nav_auth'] sm:py-7 lg:flex lg:gap-x-8">
        <Link
          to="/"
          className="no-underline [grid-area:logo] hover:text-foreground"
          aria-label="personalsite.help, home"
        >
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="[grid-area:nav] lg:ml-auto">
          <ul className="flex flex-wrap gap-x-4 gap-y-2 sm:gap-x-8">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={navLink}
                  activeProps={{ className: "underline", "aria-current": "page" }}
                  activeOptions={{ exact: true }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <Button asChild variant="pill" size="sm" className="[grid-area:cta]">
          <Link to="/submit" className="no-underline hover:text-background">
            <span className="sm:hidden">Pin up</span>
            <span className="hidden sm:inline">Pin up your site</span>
          </Link>
        </Button>
        <div className="flex items-center justify-end [grid-area:auth]">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button type="button" className={navLink}>
                Sign in
              </button>
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

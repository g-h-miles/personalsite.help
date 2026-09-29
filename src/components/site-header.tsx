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
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 py-5 sm:py-7">
        <Link
          to="/"
          className="no-underline hover:text-foreground"
          aria-label="personalsite.help, home"
        >
          <Wordmark />
        </Link>
        <div className="flex items-center gap-4 lg:order-last">
          <Button asChild variant="pill" size="sm">
            <Link to="/submit" className="no-underline hover:text-background">
              Pin up your site
            </Link>
          </Button>
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
        <nav aria-label="Main" className="w-full lg:ml-auto lg:w-auto">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 sm:gap-x-8">
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
      </div>
    </header>
  );
}

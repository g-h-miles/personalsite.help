import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";
import { LogoMark } from "@/components/logo";
import { SiteHeader } from "@/components/site-header";
import { StoreUser } from "@/components/store-user";

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: () => (
    <div className="py-16 sm:py-24">
      <h1 className="type-h1">Nothing pinned here.</h1>
      <p className="mt-6 text-xl leading-8">
        <Link to="/" className="font-semibold">
          Back to the wall
        </Link>
      </p>
    </div>
  ),
});

function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-background text-foreground">
      <StoreUser />
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-24 sm:px-8 xl:px-16">
        <Outlet />
      </main>
      <footer className="mx-auto w-full max-w-[1440px] px-4 sm:px-8 xl:px-16">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t-3 border-ink py-8 font-mono text-[13px] leading-[18px] text-ink-secondary">
          <span className="inline-flex items-center gap-2.5">
            <LogoMark className="h-5 w-auto" />
            Personal sites only. Show the best you.
          </span>
          <a
            href="https://github.com/g-h-miles/personalsite.help"
            className="text-foreground sm:ml-auto"
          >
            Open source (MIT)
          </a>
        </div>
      </footer>
    </div>
  );
}

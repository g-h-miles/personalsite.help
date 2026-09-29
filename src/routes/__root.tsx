import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { StoreUser } from "@/components/store-user";

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: () => (
    <div className="py-16">
      <h1 className="text-4xl">Not found</h1>
      <p className="mt-4">
        <Link to="/">Back to trending</Link>
      </p>
    </div>
  ),
});

function RootLayout() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <StoreUser />
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 pb-24">
        <Outlet />
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap gap-x-6 gap-y-2 px-6 py-6 text-sm text-muted-foreground">
          <span>Personal sites only. Show the best you.</span>
          <a href="https://github.com/g-h-miles/personalsite.help" className="ml-auto">
            Open source (MIT)
          </a>
        </div>
      </footer>
    </div>
  );
}

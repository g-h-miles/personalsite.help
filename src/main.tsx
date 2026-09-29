import { ClerkProvider, useAuth } from "@clerk/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SetupNotice } from "@/components/setup-notice";
import { routeTree } from "./routeTree.gen";
import "./index.css";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const router = createRouter({
  routeTree,
  // Provided for real in <RouterProvider context={...}> once the clients exist.
  context: { queryClient: undefined! },
  defaultPreload: "intent",
  scrollRestoration: true,
});

function createApp(convexUrl: string, clerkKey: string) {
  const convex = new ConvexReactClient(convexUrl);
  const convexQueryClient = new ConvexQueryClient(convex);
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
      },
    },
  });
  convexQueryClient.connect(queryClient);

  return (
    <ClerkProvider publishableKey={clerkKey} afterSignOutUrl="/">
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} context={{ queryClient }} />
        </QueryClientProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

// Register the router for type safety.
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("#root not found");

createRoot(root).render(
  <StrictMode>
    {CONVEX_URL && CLERK_PUBLISHABLE_KEY ? (
      createApp(CONVEX_URL, CLERK_PUBLISHABLE_KEY)
    ) : (
      <SetupNotice missing={{ convex: !CONVEX_URL, clerk: !CLERK_PUBLISHABLE_KEY }} />
    )}
  </StrictMode>,
);

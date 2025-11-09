import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
// Global styles are imported via main.tsx; ensure not duplicated.
import { AuthProvider } from "./components/AuthProvider";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import JoinProduct from "./pages/JoinProduct";
import ListingPage from "./pages/ListingPage";
import NotFound from "./pages/not-found";
import LegalPage from "./pages/LegalPage";

function Router() {

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/home" component={Home} />
      <Route path="/admin" component={Admin} />
      <Route path="/listing/:listingId" component={ListingPage} />
      <Route path="/join/:productId" component={JoinProduct} />
      <Route path="/legal/:slug" component={LegalPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const queryClient = useQueryClient();
  
  // Handle token from OAuth redirect and auto-grant listing access post-auth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');

    if (token) {
      localStorage.setItem('token', token);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Invalidate the auth query to force a refresh
      // Force a refetch of auth state
      queryClient.resetQueries({ queryKey: ['auth-user'] });

      // If we have a stored listing key from pre-auth navigation, auto-grant access now
      try {
        const pathMatch = window.location.pathname.match(/^\/listing\/(.+)$/);
        if (pathMatch && pathMatch[1]) {
          const listingId = pathMatch[1];
          const storageKey = `listing_key_${listingId}`;
          const savedKey = sessionStorage.getItem(storageKey);
          if (savedKey) {
            // Fire-and-forget grant; ListingPage will also handle its own flow
            fetch(`/api/listings/${listingId}/grant-access`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ key: savedKey }),
            }).finally(() => {
              sessionStorage.removeItem(storageKey);
            });
          }
        }
      } catch {}
    } else if (error) {
      // Handle error
      console.error('Authentication error:', error);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

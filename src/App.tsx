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

function Router() {

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/home" component={Home} />
      <Route path="/admin" component={Admin} />
      <Route path="/listing/:listingId" component={ListingPage} />
      <Route path="/join/:productId" component={JoinProduct} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const queryClient = useQueryClient();
  
  // Handle token from Google OAuth redirect
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

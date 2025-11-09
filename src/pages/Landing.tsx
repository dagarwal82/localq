import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Package, QrCode, Users } from "lucide-react";
import { AuthForm } from "../components/AuthForm";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { apiRequest } from "../lib/queryClient";
import { GarageSaleLogo } from "../components/GarageSaleLogo";

export default function Landing() {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [, setLocation] = useLocation();

  // Check if user is already authenticated (e.g., after OAuth redirect)
  useEffect(() => {
    const checkAuth = async () => {
      try {
          const user = await apiRequest("GET", "/api/auth/me");
        if (user && user.email) {
          const redirectTarget = sessionStorage.getItem("postAuthRedirect") || "/home";
          sessionStorage.removeItem("postAuthRedirect");
          setLocation(redirectTarget);
        }
      } catch (error) {
        // Not authenticated; remain on landing
      }
    };
    checkAuth();
  }, [setLocation]);

  // If url contains ?login=1, open login dialog automatically
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("login") === "1") {
      setAuthMode('login');
      setShowAuth(true);
      // Clean the param from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('login');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, []);

  const handleAuthSuccess = () => {
    setShowAuth(false);
    const redirectTarget = sessionStorage.getItem("postAuthRedirect") || "/home";
    sessionStorage.removeItem("postAuthRedirect");
    setLocation(redirectTarget);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Dialog open={showAuth} onOpenChange={setShowAuth}>
        <DialogContent className="sm:max-w-md">
          <AuthForm mode={authMode} onSuccess={handleAuthSuccess} />
        </DialogContent>
      </Dialog>
      
      <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <a href="https://spacevox.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:opacity-90 transition" aria-label="SpaceVox website">
            <GarageSaleLogo size={40} className="text-primary" />
            <h1 className="text-2xl font-bold" data-testid="text-app-title">SpaceVox</h1>
          </a>
          <Button
            onClick={() => {
              // Preserve an existing redirect (e.g., listing URL) if already set
              const existing = sessionStorage.getItem("postAuthRedirect");
              if (!existing) sessionStorage.setItem("postAuthRedirect", "/home");
              setAuthMode('login');
              setShowAuth(true);
            }}
            data-testid="button-login"
          >
            Log In
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold" data-testid="text-welcome-title">
              Create Your Own Listings
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-welcome-description">
              Sign up to create and manage your marketplace listings. Track buyer interest, share QR codes, and coordinate pickups effortlessly.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Button
                size="lg"
                onClick={() => {
                  const existing = sessionStorage.getItem("postAuthRedirect");
                  if (!existing) sessionStorage.setItem("postAuthRedirect", "/home");
                  setAuthMode('signup');
                  setShowAuth(true);
                }}
                data-testid="button-signup"
              >
                Sign Up to Create Listings
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 pt-8">
            <Card data-testid="card-feature-listings">
              <CardHeader>
                <Package className="w-12 h-12 mb-2 text-primary" />
                <CardTitle>Create Listings</CardTitle>
                <CardDescription>
                  List your items with photos, descriptions, and prices
                </CardDescription>
              </CardHeader>
            </Card>

            <Card data-testid="card-feature-qr">
              <CardHeader>
                <QrCode className="w-12 h-12 mb-2 text-primary" />
                <CardTitle>Share via QR Code</CardTitle>
                <CardDescription>
                  Let buyers self-register by scanning your QR code
                </CardDescription>
              </CardHeader>
            </Card>

            <Card data-testid="card-feature-queue">
              <CardHeader>
                <Users className="w-12 h-12 mb-2 text-primary" />
                <CardTitle>Manage Queues</CardTitle>
                <CardDescription>
                  Track interested buyers and coordinate pickup times
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p data-testid="text-footer">SpaceVox - Simplifying Local Marketplace Sales</p>
        </div>
      </footer>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "../lib/queryClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useToast } from "../hooks/use-toast";

export default function VerifyEmailPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"idle"|"pending"|"success"|"error">("idle");
  const [message, setMessage] = useState<string>("");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    setToken(t);
    if (!t) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }
    const run = async () => {
      setStatus("pending");
      try {
        // Forward exactly as provided path and query
        const forwardPath = `${window.location.pathname}${window.location.search}`;
        await apiRequest("GET", forwardPath);
        setStatus("success");
        setMessage("Email verified successfully.");
        toast({ title: "Email Verified", description: "You can now log in." });
        // Redirect to login (landing) after short delay
        setTimeout(() => setLocation("/?login=1"), 1500);
      } catch (e: any) {
        setStatus("error");
        setMessage(e?.message || "Verification failed.");
        toast({ variant: "destructive", title: "Verification Failed", description: e?.message || "Invalid or expired token." });
        // Also route to login so they can try signing in
        setTimeout(() => setLocation("/?login=1"), 1500);
      }
    };
    run();
  }, [setLocation, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>Confirming your email address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "pending" && (
            <div className="flex items-center gap-3 text-muted-foreground" data-testid="verify-loading">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Verifying token…</span>
            </div>
          )}
          {status === "success" && (
            <div className="flex items-start gap-3 text-green-600 dark:text-green-400" data-testid="verify-success">
              <CheckCircle className="w-6 h-6" />
              <div>
                <p className="font-medium">{message}</p>
                <p className="text-xs mt-1">Redirecting you to login…</p>
              </div>
            </div>
          )}
          {status === "error" && (
            <div className="flex items-start gap-3 text-destructive" data-testid="verify-error">
              <XCircle className="w-6 h-6" />
              <div>
                <p className="font-medium">{message}</p>
                <p className="text-xs mt-1">Request a new verification email or try logging in.</p>
              </div>
            </div>
          )}
          {(status === "error" || status === "success") && (
            <div className="pt-2 flex gap-2">
              <Button size="sm" variant="default" onClick={() => setLocation("/?login=1")} data-testid="verify-go-login">
                Go to Login
              </Button>
              {status === "error" && token && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    // Retry once
                    setStatus("pending");
                    try {
                      const forwardPath = `${window.location.pathname}${window.location.search}`;
                      await apiRequest("GET", forwardPath);
                      setStatus("success");
                      setMessage("Email verified successfully.");
                      toast({ title: "Email Verified", description: "You can now log in." });
                      setTimeout(() => setLocation("/?login=1"), 1500);
                    } catch (e:any) {
                      setStatus("error");
                      setMessage(e?.message || "Verification failed again.");
                    }
                  }}
                  data-testid="verify-retry"
                >
                  Retry
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

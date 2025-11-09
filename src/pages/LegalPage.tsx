import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { GarageSaleLogo } from "../components/GarageSaleLogo";
import { Button } from "../components/ui/button";

// Simple map from slug to public file
const FILE_MAP: Record<string, string> = {
  terms: "/terms.html",
  privacy: "/privacy.html",
  disclaimer: "/disclaimer.html",
};

export default function LegalPage() {
  const [, params] = useRoute("/legal/:slug");
  const slug = params?.slug || "";
  const [, setLocation] = useLocation();
  const [html, setHtml] = useState<string>("Loading…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const file = FILE_MAP[slug];
    if (!file) {
      setError("Unknown page");
      return;
    }
    (async () => {
      try {
        const res = await fetch(file, { credentials: "include" });
        if (!res.ok) throw new Error(`Failed to load (${res.status})`);
        // We only want the body content; for simplicity insert full HTML inside a sandbox div.
        const text = await res.text();
        // Extract between <body> tags if present
        const match = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        setHtml(match ? match[1] : text);
      } catch (e: any) {
        setError(e.message || "Failed to load page");
      }
    })();
  }, [slug]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-3 hover:opacity-90 transition"
            aria-label="Back to landing"
          >
            <GarageSaleLogo size={40} className="text-primary" />
            <span className="text-xl font-bold">SpaceVox</span>
          </button>
          <Button variant="outline" size="sm" onClick={() => setLocation("/home")}>Enter App</Button>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        {error ? (
          <div className="p-4 border border-destructive/40 bg-destructive/10 rounded-md text-destructive text-sm">
            {error}
          </div>
        ) : (
          <article
            className="prose dark:prose-invert max-w-none"
            // Intentionally using dangerouslySetInnerHTML to render static legal copy
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <div className="container mx-auto px-4 flex flex-col gap-2">
          <nav className="flex flex-wrap gap-4 justify-center">
            <button onClick={() => setLocation("/legal/terms")} className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">Terms</button>
            <button onClick={() => setLocation("/legal/privacy")} className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">Privacy</button>
            <button onClick={() => setLocation("/legal/disclaimer")} className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">Disclaimer</button>
            <button onClick={() => setLocation("/home")} className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">Home</button>
          </nav>
          <p>© {new Date().getFullYear()} SpaceVox</p>
        </div>
      </footer>
    </div>
  );
}

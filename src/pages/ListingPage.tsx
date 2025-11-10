import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useRoute, Link } from "wouter";
import { useState, useEffect } from "react";
import { ProductCard } from "../components/ProductCard";
import { ShareProductDialog } from "../components/ShareProductDialog";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useToast } from "../hooks/use-toast";
import { RefreshCw, ArrowLeft } from "lucide-react";
import type { Product } from "./Home";
import type { Listing } from "../types/listing";
import { addToViewHistory } from "../lib/viewHistory";

export default function ListingPage() {
  const [, params] = useRoute("/listing/:listingId");
  const listingId = params?.listingId || "";
  const { toast } = useToast();
  
  const searchParams = new URLSearchParams(window.location.search);
  const keyFromUrl = searchParams.get("k") || searchParams.get("key");
  
  const [keyInput, setKeyInput] = useState(keyFromUrl || "");
  const [needsKey, setNeedsKey] = useState(false);

  // Store key in sessionStorage if it comes from URL (for post-auth flow)
  useEffect(() => {
    if (keyFromUrl && listingId) {
      const storageKey = `listing_key_${listingId}`;
      sessionStorage.setItem(storageKey, keyFromUrl);
    }
  }, [keyFromUrl, listingId]);

  // Check for stored key (in case user came back after authentication)
  const storedKey = sessionStorage.getItem(`listing_key_${listingId}`);
  const effectiveKey = keyFromUrl || storedKey;

  // Check if user already has access to this listing
  const { data: hasAccess, isLoading: checkingAccess, refetch: refetchAccess } = useQuery<boolean>({
    queryKey: ["/api/listings", listingId, "has-access"],
    queryFn: async () => {
      try {
        const result = await apiRequest("GET", `/api/listings/${listingId}/has-access`);
        // Backend returns boolean or { hasAccess: boolean }
        return result === true || result?.hasAccess === true;
      } catch (e: any) {
        // 401 means not authenticated; still allow key entry for public access
        if (String(e?.message).startsWith("401")) {
          return false;
        }
        return false;
      }
    },
    enabled: !!listingId,
  });

  // Grant access mutation (validates key and stores access server-side)
  const grantAccessMutation = useMutation({
    mutationFn: async (key: string) => 
      apiRequest("POST", `/api/listings/${listingId}/grant-access`, { key }),
    onSuccess: () => {
      refetchAccess();
      toast({ title: "Access granted", description: "You can now view all items in this listing." });
      setNeedsKey(false);
      // Clear stored key after successful grant
      sessionStorage.removeItem(`listing_key_${listingId}`);
      // Clear URL params after successful validation
      window.history.replaceState({}, '', `/listing/${listingId}`);
    },
    onError: (e: any) => {
      toast({ 
        variant: "destructive", 
        title: "Invalid key", 
        description: e?.message || "The key you entered is incorrect." 
      });
    },
  });

  // Check auth status for gating grant-access
  const { data: me } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try { return await apiRequest("GET", "/api/auth/me"); } catch { return null; }
    },
  });

  // Auto-grant access only when authenticated and a key is present
  useEffect(() => {
    const isAuthed = !!me?.id || !!me?.email;
    if (effectiveKey && hasAccess === false && isAuthed && !grantAccessMutation.isPending && !grantAccessMutation.isSuccess) {
      grantAccessMutation.mutate(effectiveKey);
    } else if (hasAccess === false && !effectiveKey && !checkingAccess && !grantAccessMutation.isPending) {
      setNeedsKey(true);
    }
  }, [hasAccess, effectiveKey, checkingAccess, me]);

  // Fetch listing details and products using public endpoint when key is available (works for anonymous users)
  const { data: publicListingData, error: publicError, isLoading: publicLoading } = useQuery<Listing & { products: Product[] }>({
    queryKey: ["/api/listings/public", listingId, effectiveKey],
    queryFn: async () => {
      if (!effectiveKey) throw new Error("NO_KEY");
      try {
        return await apiRequest("GET", `/api/listings/public/${listingId}?key=${encodeURIComponent(effectiveKey)}`);
      } catch (e: any) {
        // Normalize common error scenarios
        const msg = String(e.message || "");
        if (msg.startsWith("404")) {
          throw new Error("NOT_FOUND");
        }
        if (msg.startsWith("401") || msg.includes("Invalid key") || msg.includes("invalid key") || msg.startsWith("400")) {
          throw new Error("INVALID_KEY");
        }
        throw new Error("GENERIC_ERROR");
      }
    },
    enabled: !!effectiveKey,
    retry: false,
  });

  // Fetch listing details using private endpoint for authenticated users without key
  const { data: privateListingData, isLoading: privateLoading } = useQuery<Listing & { products: Product[] }>({
    queryKey: ["/api/listings", listingId],
    queryFn: () => apiRequest("GET", `/api/listings/${listingId}`),
    enabled: hasAccess === true && !effectiveKey,
  });

  // Use public or private data depending on what's available
  const listing: Listing | undefined = publicListingData || privateListingData;
  const items: Product[] = publicListingData?.products || privateListingData?.products || [];
  const itemsLoading = effectiveKey ? publicLoading : privateLoading;

  // Track listing view when listing data is loaded
  useEffect(() => {
    if (listing && listingId) {
      addToViewHistory(listingId, listing.name);
    }
  }, [listing, listingId]);

  const handleVerifyKey = () => {
    if (keyInput.trim()) {
      grantAccessMutation.mutate(keyInput.trim());
    }
  };

  // Only show loading spinner when checking access initially (not during key validation)
  if (checkingAccess && !effectiveKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show key entry form ONLY if user doesn't have access AND no key is available
  if (needsKey && hasAccess === false && !effectiveKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Enter Listing Key</CardTitle>
            <p className="text-sm text-muted-foreground">
              This listing requires a key to prevent spam. Enter it once to gain permanent access.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Enter listing key"
              className="w-full"
              onKeyDown={(e) => e.key === "Enter" && handleVerifyKey()}
              data-testid="input-listing-key"
            />
            <Button 
              onClick={handleVerifyKey} 
              disabled={!keyInput.trim() || grantAccessMutation.isPending}
              className="w-full"
              data-testid="button-verify-key"
            >
              {grantAccessMutation.isPending ? "Verifying..." : "Verify Key"}
            </Button>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">
                Don't have an account? Create one to save your access permanently.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Store current page for post-auth redirect
                  const currentUrl = window.location.pathname + window.location.search;
                  sessionStorage.setItem("postAuthRedirect", currentUrl);
                  window.location.href = "/";
                }}
              >
                Sign Up / Log In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeItems = items.filter(p => p.status === "AVAILABLE");
  const soldItems = items.filter(p => p.status === "SOLD");

  // Handle invalid public key gracefully for anonymous access
  const showInvalidKey = effectiveKey && publicError && (publicError as Error).message === "INVALID_KEY";
  const showNotFound = publicError && (publicError as Error).message === "NOT_FOUND";
  const showGenericError = publicError && (publicError as Error).message === "GENERIC_ERROR";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/home">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{listing?.name || "Listing"}</h1>
              {listing?.description && (
                <p className="text-sm text-muted-foreground">{listing.description}</p>
              )}
            </div>
            {listing && (
              <div className="w-48">
                <ShareProductDialog
                  listingId={listing.id}
                  listingKey={listing.key}
                  listingName={listing.name}
                />
              </div>
            )}
          </div>
        </div>
      </header>
      
      <main className="container max-w-4xl mx-auto px-4 py-6">
        {showInvalidKey && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg" data-testid="alert-invalid-key">
            <p className="text-sm text-destructive font-medium">Invalid key</p>
            <p className="text-xs text-muted-foreground mt-1">The key in your link is incorrect or expired. Enter the correct key below.</p>
            <div className="mt-3 flex gap-2">
              <Input
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Enter listing key"
                className="flex-1"
              />
              <Button onClick={handleVerifyKey} disabled={!keyInput.trim() || grantAccessMutation.isPending}>
                {grantAccessMutation.isPending ? "Verifying..." : "Verify"}
              </Button>
            </div>
          </div>
        )}

        {showNotFound && (
          <div className="mb-4 p-4 bg-muted/20 border border-border rounded-lg" data-testid="alert-listing-not-found">
            <p className="text-sm font-medium">Listing not found</p>
            <p className="text-xs text-muted-foreground mt-1">This listing may have been removed or the link is incorrect.</p>
          </div>
        )}

        {showGenericError && (
          <div className="mb-4 p-4 bg-muted/20 border border-border rounded-lg" data-testid="alert-generic-error">
            <p className="text-sm font-medium">Something went wrong</p>
            <p className="text-xs text-muted-foreground mt-1">Please try again or contact the owner for a new link.</p>
          </div>
        )}

        {grantAccessMutation.isPending && (
          <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-lg text-center">
            <RefreshCw className="w-5 h-5 animate-spin text-primary inline-block mr-2" />
            <span className="text-sm text-foreground">Validating access key...</span>
          </div>
        )}
        
        {itemsLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No items in this listing yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Available items */}
            {activeItems.length > 0 && (
              <div className="space-y-4" data-testid="section-available-items">
                {activeItems.map((item) => (
                  <ProductCard 
                    key={item.id} 
                    product={item}
                    listing={listing}
                    isOwner={false}
                    onMarkSold={() => {}}
                    onRemove={() => {}}
                  />
                ))}
              </div>
            )}
            {/* Sold items */}
            {soldItems.length > 0 && (
              <div className="space-y-4" data-testid="section-sold-items">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sold Items</h2>
                {soldItems.map((item) => (
                  <ProductCard
                    key={item.id}
                    product={item}
                    listing={listing}
                    isOwner={false}
                    onMarkSold={() => {}}
                    onRemove={() => {}}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

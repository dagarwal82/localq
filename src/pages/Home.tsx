// ...existing code...
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "../lib/queryClient";
import { ProductCard } from "../components/ProductCard";
import { AddProductDialog } from "../components/AddProductDialog";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Package, RefreshCw, LogOut, Shield } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import ListingManagerDialog from "../components/ListingManagerDialog";
import type { Listing } from "../types/listing";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
// Local type definitions for Product and BuyerInterest
// Matches ProductDTO from OpenAPI spec
export interface Product {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  description: string;
  price: number;
  status: string;
  accountId: string;
  listingId?: string;
  images?: ProductImage[];
  location?: string;
  category?: string;
  condition?: string;
}

export interface ProductImage {
  id: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  displayOrder: number;
  productId: string;
}

// Matches BuyingQueueDTO from OpenAPI spec
export interface BuyerInterest {
  id: string;
  createdAt: string;
  updatedAt?: string;
  productId: string;
  pickupTime: string;
  offerPrice: number;
  status: string;
  hideMe?: boolean;
  buyerEmail?: string;
  queuePosition?: number;
}
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

export default function Home() {
  const { toast } = useToast();
  const [newListingName, setNewListingName] = useState("");
  const [newListingDesc, setNewListingDesc] = useState("");
  const [, setLocation] = useLocation();

  // Check authentication - redirect to landing if not authenticated
  const { data: user, isLoading: isAuthLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        return await apiRequest("GET", "/api/auth/me");
      } catch (error) {
        // Not authenticated
        return null;
      }
    },
  });

  // Get all products
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/products");
      return res;
    },
    enabled: !!user, // Only fetch when user is authenticated
  });

  // Get listings for current account
  const { data: listings = [], isLoading: listingsLoading } = useQuery<Listing[]>({
    queryKey: ["/api/listings", "mine"],
    queryFn: async () => apiRequest("GET", "/api/listings/account/me"),
    enabled: !!user, // Only fetch when user is authenticated
  });

  const createListingMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/listings", { name: newListingName, description: newListingDesc }),
    onSuccess: () => {
      setNewListingName("");
      setNewListingDesc("");
      queryClient.invalidateQueries({ queryKey: ["/api/listings", "mine"] });
      toast({ title: "Listing created", description: "You can now add items to it." });
    },
    onError: (e: any) => {
      toast({ variant: "destructive", title: "Error", description: e?.message || "Failed to create listing" });
    }
  });

  const markSoldMutation = useMutation({
    mutationFn: async (productId: string) => {
      // Call backend endpoint to mark as sold
      return apiRequest("PUT", `/api/products/${productId}/markAsSold`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Marked as sold",
        description: "Product has been marked as sold",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (productId: string) => {
      // Delete product entirely
      return apiRequest("DELETE", `/api/products/${productId}`);
    },
    onMutate: async (productId: string) => {
      // Cancel any outgoing refetches for products
      await queryClient.cancelQueries({ queryKey: ["/api/products"] });
      // Snapshot previous value
      const previous = queryClient.getQueryData<Product[]>(["/api/products"]);
      // Optimistically update to remove the product
      if (previous) {
        queryClient.setQueryData<Product[]>(["/api/products"], previous.filter(p => p.id !== productId));
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Rollback to previous state
      if (context?.previous) {
        queryClient.setQueryData(["/api/products"], context.previous);
      }
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete listing",
      });
    },
    onSettled: () => {
      // Re-sync from server
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Product removed",
        description: "Listing has been deleted",
      });
    }
  });

  const addBuyerMutation = useMutation({
    mutationFn: async ({ productId, buyer }: { productId: string; buyer: Omit<BuyerInterest, "id" | "productId" | "createdAt"> }) => {
      // Show interest in a product (add to buying queue)
      return await apiRequest("POST", "/api/buying-queue", {
        ...buyer,
        productId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buying-queue"] });
      toast({
        title: "Buyer added",
        description: "Buyer has been added to the queue",
      });
    },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/buying-queue"] });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      // Save current path to redirect back after login
      sessionStorage.setItem("postAuthRedirect", "/home");
      setLocation("/");
    }
  }, [user, isAuthLoading, setLocation]);

  // Show loading while checking authentication
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  // Note: AddProductDialog performs creation and image upload itself.
  // Here we only refresh data after it signals completion.

  const activeProducts = products.filter(p => p.status === "AVAILABLE");
  const soldProducts = products.filter(p => p.status === "SOLD");
  const hasListings = listings.length > 0;

  // Buyers are now fetched per ProductCard via /api/buying-queue/product/{id}
  const getBuyersForProduct = (_productId: string) => [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">SpaceVox</h1>
            </div>
            <div className="flex items-center gap-2">
              <ListingManagerDialog />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/products"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/buying-queue"] });
                }}
                data-testid="button-refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  queryClient.clear();
                  window.location.href = "/";
                }}
                data-testid="button-logout"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-6">
            <TabsTrigger value="active" data-testid="tab-active">
              Active ({activeProducts.length})
            </TabsTrigger>
            <TabsTrigger value="sold" data-testid="tab-sold">
              Sold ({soldProducts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4" data-testid="list-active-products">
            {!hasListings && !listingsLoading && (
              <div className="max-w-xl mx-auto border rounded-lg p-8 text-center bg-muted/30">
                <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2">Create Your First Listing</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Listings group related items (e.g., a yard sale, office giveaway, or community swap). First create a listing, then add individual items to it.
                </p>
                <div className="grid gap-3 text-left">
                  <div>
                    <Label className="text-xs uppercase">Listing Name</Label>
                    <Input
                      value={newListingName}
                      onChange={(e) => setNewListingName(e.target.value)}
                      placeholder="e.g. Saturday Yard Sale"
                      data-testid="input-new-listing-name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase">Description (optional)</Label>
                    <Input
                      value={newListingDesc}
                      onChange={(e) => setNewListingDesc(e.target.value)}
                      placeholder="Short description"
                      data-testid="input-new-listing-desc"
                    />
                  </div>
                  <Button
                    onClick={() => createListingMutation.mutate()}
                    disabled={!newListingName.trim() || createListingMutation.isPending}
                    data-testid="button-create-first-listing"
                  >
                    {createListingMutation.isPending ? "Creating..." : "Create Listing"}
                  </Button>
                  <p className="text-xs text-muted-foreground">A listing key will be generated automatically for sharing.</p>
                </div>
              </div>
            )}

            {hasListings && activeProducts.length === 0 && (
              <div className="max-w-xl mx-auto border rounded-lg p-10 text-center bg-muted/20" data-testid="empty-items-state">
                <Package className="w-14 h-14 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No items yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Add your first item to this account’s listings. Each item will belong to one listing.</p>
                <p className="text-xs text-muted-foreground">Use the + button bottom-right to add an item.</p>
              </div>
            )}

            {hasListings && activeProducts.length > 0 && (
              activeProducts.map(product => {
                const productListing = listings.find(l => String(l.id) === String(product.listingId));
                if (!productListing && product.listingId) {
                  console.warn('Product has listingId but no matching listing found:', {
                    productId: product.id,
                    productListingId: product.listingId,
                    availableListingIds: listings.map(l => l.id)
                  });
                }
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    listing={productListing}
                    isOwner={true}
                    onMarkSold={(id) => markSoldMutation.mutate(id)}
                    onRemove={(id) => removeMutation.mutate(id)}
                  />
                );
              })
            )}
          </TabsContent>

          <TabsContent value="sold" className="space-y-4" data-testid="list-sold-products">
            {soldProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No sold items yet
                </p>
              </div>
            ) : (
              soldProducts.map(product => {
                const productListing = listings.find(l => String(l.id) === String(product.listingId));
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    listing={productListing}
                    isOwner={true}
                    onMarkSold={() => {}}
                    onRemove={() => {}}
                  />
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </main>

      <AddProductDialog onAddProduct={() => {
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      }} />
    </div>
  );
}

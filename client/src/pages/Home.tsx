// ...existing code...
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ProductCard } from "@/components/ProductCard";
import { AddProductDialog } from "@/components/AddProductDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, RefreshCw, LogOut, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// import { useAuth } from "@/hooks/useAuth";
// import { logout } from "@/lib/auth";
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
import { useEffect } from "react";
import { Link } from "wouter";

export default function Home() {
  const { toast } = useToast();

  // Get all products
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/products");
      return res;
    },
  });

  // Get all buying queue entries
  const { data: allBuyers = [] } = useQuery<BuyerInterest[]>({
    queryKey: ["/api/buying-queue"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/buying-queue");
      return res;
    },
  });

  const addProductMutation = useMutation({
    mutationFn: async (product: Partial<Product>) => {
      // Product creation matches ProductDTO
      return await apiRequest("POST", "/api/products", product);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Product added",
        description: "Your listing has been created successfully",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create listing",
      });
    },
  });

  const markSoldMutation = useMutation({
    mutationFn: async (productId: string) => {
      // Update product status to sold
      return apiRequest("PUT", `/api/products/${productId}`, { status: "sold" });
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
      // Update product status to removed
      return apiRequest("PUT", `/api/products/${productId}`, { status: "removed" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Product removed",
        description: "Listing has been removed",
      });
    },
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

  const activeProducts = products.filter(p => p.status === "active");
  const soldProducts = products.filter(p => p.status === "sold");

  const getBuyersForProduct = (productId: string) => {
    return allBuyers.filter(b => b.productId === productId);
  };

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
            {activeProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-lg font-medium text-foreground mb-2">No active listings</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Create your first listing to start managing buyers
                </p>
              </div>
            ) : (
              activeProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  buyers={getBuyersForProduct(product.id)}
                  onMarkSold={(id) => markSoldMutation.mutate(id)}
                  onRemove={(id) => removeMutation.mutate(id)}
                  onAddBuyer={(productId, buyer) => addBuyerMutation.mutate({ productId, buyer })}
                />
              ))
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
              soldProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  buyers={getBuyersForProduct(product.id)}
                  onMarkSold={() => {}}
                  onRemove={() => {}}
                  onAddBuyer={() => {}}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      <AddProductDialog onAddProduct={(product) => addProductMutation.mutate(product)} />
    </div>
  );
}

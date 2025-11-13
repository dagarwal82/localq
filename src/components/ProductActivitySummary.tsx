import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Bell, ChevronRight, Package, Users, Clock } from "lucide-react";
import { Button } from "./ui/button";
import type { Product } from "../pages/Home";

interface BuyerInterest {
  id: string;
  productId: string;
  status: string;
  pickupTime: string;
  createdAt: string;
}

interface ProductActivitySummaryProps {
  products: Product[];
  onNavigateToProduct: (productId: string) => void;
}

export function ProductActivitySummary({ products, onNavigateToProduct }: ProductActivitySummaryProps) {
  // Fetch all buyer interests for all products
  const productIds = products.map(p => p.id);
  
  const buyerQueries = useQuery<{ [productId: string]: BuyerInterest[] }>({
    queryKey: ["/api/buying-queue", "summary"],
    queryFn: async () => {
      const result: { [productId: string]: BuyerInterest[] } = {};
      
      // Fetch buyers for each product
      await Promise.all(
        productIds.map(async (productId) => {
          try {
            const buyers = await apiRequest("GET", `/api/buying-queue/product/${productId}`);
            result[productId] = buyers || [];
          } catch {
            result[productId] = [];
          }
        })
      );
      
      return result;
    },
    enabled: productIds.length > 0,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const buyersByProduct = buyerQueries.data || {};

  // Calculate activity for each product
  const productsWithActivity = products
    .map(product => {
      const buyers = buyersByProduct[product.id] || [];
      const pendingCount = buyers.filter(b => b.status === "PENDING").length;
      const totalBuyers = buyers.length;
      const hasNewActivity = buyers.some(b => {
        const createdAt = new Date(b.createdAt);
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return createdAt > hourAgo && b.status === "PENDING";
      });

      return {
        product,
        pendingCount,
        totalBuyers,
        hasNewActivity,
      };
    })
    .filter(item => item.pendingCount > 0); // Only show products with pending buyers

  if (productsWithActivity.length === 0) {
    return null;
  }

  const totalPending = productsWithActivity.reduce((sum, item) => sum + item.pendingCount, 0);

  return (
    <Card className="mb-6 border-warning/50 bg-warning/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="w-5 h-5 text-warning" />
          Activity Summary
          <Badge variant="default" className="ml-auto bg-warning text-warning-foreground">
            {totalPending} pending
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {productsWithActivity.map(({ product, pendingCount, totalBuyers, hasNewActivity }) => (
            <div
              key={product.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{product.title}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {totalBuyers} interested
                    </span>
                    <span className="flex items-center gap-1 text-warning font-medium">
                      <Clock className="w-3 h-3" />
                      {pendingCount} pending
                    </span>
                  </div>
                </div>
                {hasNewActivity && (
                  <Badge variant="destructive" className="text-xs">
                    New
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateToProduct(product.id)}
                className="flex-shrink-0"
              >
                View
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

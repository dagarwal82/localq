import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Package, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface PublicProduct {
  id: number;
  title: string;
  description: string;
  price: number;
  queueLength: number;
  images?: Array<{ url?: string; imageUrl?: string }>;
  listingId?: string;
}

export default function JoinProduct() {
  const [, params] = useRoute("/join/:productId");
  const [, setLocation] = useLocation();
  const productId = params?.productId || "";

  const { data: product, isLoading } = useQuery<PublicProduct>({
    queryKey: ["/api/products", productId, "public"],
    queryFn: async () => {
      try {
        return await apiRequest("GET", `/api/products/${productId}/public`);
      } catch (e: any) {
        if (e?.message?.startsWith("410:")) {
          throw new Error("This listing is no longer available");
        }
        throw new Error("Failed to load product");
      }
    },
    enabled: !!productId,
  });

  useEffect(() => {
    if (product?.listingId) {
      const searchParams = window.location.search;
      setLocation(`/listing/${product.listingId}${searchParams}`);
    }
  }, [product, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Redirecting to listing...
            </h2>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

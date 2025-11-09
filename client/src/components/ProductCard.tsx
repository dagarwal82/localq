import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Package, Clock, DollarSign, Users, ChevronDown, ChevronUp } from "lucide-react";
import type { Product, BuyerInterest } from "@/pages/Home";
import type { ProductImage } from "@/pages/Home";
import { BuyerQueueItem } from "./BuyerQueueItem";
import { AddBuyerDialog } from "./AddBuyerDialog";
import { ShareProductDialog } from "./ShareProductDialog";

interface ProductCardProps {
  product: Product;
  buyers: BuyerInterest[];
  onMarkSold: (productId: string) => void;
  onRemove: (productId: string) => void;
  onAddBuyer: (productId: string, buyer: Omit<BuyerInterest, "id" | "productId" | "createdAt">) => void;
}

export function ProductCard({ product, buyers, onMarkSold, onRemove, onAddBuyer }: ProductCardProps) {
  const [expanded, setExpanded] = useState(false);
  const activeBuyers = buyers.filter(b => b.status === "active").sort((a, b) => (a.queuePosition ?? 0) - (b.queuePosition ?? 0));
  const nextBuyer = activeBuyers[0];
  const missedBuyers = buyers.filter(b => b.status === "missed");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success text-success-foreground";
      case "sold":
        return "bg-primary text-primary-foreground";
      case "removed":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  // Backend now supplies product.price as a decimal dollar amount (e.g. 25.50)
  const formatPrice = (amount: number) => {
    return amount.toFixed(2);
  };

  return (
    <Card className="overflow-hidden hover-elevate" data-testid={`card-product-${product.id}`}>
      <div className="relative">
        {product.images && product.images.length > 0 ? (
          <div className="relative w-full aspect-square bg-muted group">
            {product.images.map((image: ProductImage, index) => (
              <img
                key={index}
                src={image.url}
                alt={`${product.title} - Image ${index + 1}`}
                className={`absolute w-full h-full object-cover transition-opacity duration-300
                  ${index === 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                data-testid={`img-product-${product.id}-${index}`}
              />
            ))}
            {product.images.length > 1 && (
              <Badge className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm">
                {product.images.length} images
              </Badge>
            )}
          </div>
        ) : (
          <div className="relative w-full aspect-square bg-muted flex items-center justify-center">
            <Package className="w-16 h-16 text-muted-foreground" />
          </div>
        )}
        <Badge className={`absolute top-2 right-2 ${getStatusColor(product.status)} text-xs font-medium uppercase tracking-wide`} data-testid={`badge-status-${product.id}`}>
          {product.status}
        </Badge>
      </div>

      <CardContent className="p-4 space-y-2">
        <h3 className="text-lg font-semibold text-foreground" data-testid={`text-title-${product.id}`}>{product.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-description-${product.id}`}>{product.description}</p>
        
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-foreground" data-testid={`text-price-${product.id}`}>{formatPrice(product.price)}</span>
        </div>

        {activeBuyers.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span data-testid={`text-buyer-count-${product.id}`}>{activeBuyers.length} interested buyer{activeBuyers.length !== 1 ? 's' : ''}</span>
          </div>
        )}

        {product.status === "active" && (
          <div className="pt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between"
              onClick={() => setExpanded(!expanded)}
              data-testid={`button-toggle-queue-${product.id}`}
            >
              <span className="text-sm font-medium">
                {activeBuyers.length === 0 ? "No buyers yet" : "View Queue"}
              </span>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>

            {expanded && (
              <div className="mt-4 space-y-2" data-testid={`div-queue-${product.id}`}>
                {activeBuyers.map((buyer, index) => (
                  <BuyerQueueItem
                    key={buyer.id}
                    buyer={buyer}
                    isNext={index === 0}
                  />
                ))}
                {missedBuyers.map((buyer) => (
                  <BuyerQueueItem
                    key={buyer.id}
                    buyer={buyer}
                    isNext={false}
                  />
                ))}
                {activeBuyers.length === 0 && missedBuyers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No buyers in queue
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {product.status === "active" && (
        <CardFooter className="p-4 pt-0 flex flex-col gap-2">
          <ShareProductDialog
            productId={product.id}
            productTitle={product.title}
          />
          <AddBuyerDialog
            productId={product.id}
            onAddBuyer={(buyer) => onAddBuyer(product.id, buyer)}
          />
          <div className="flex gap-2 w-full">
            <ConfirmButton
              variant="default"
              size="sm"
              className="flex-1"
              onConfirm={() => onMarkSold(product.id)}
              confirmTitle="Mark item as sold?"
              confirmDescription="This will mark the item as sold and notify interested buyers."
              data-testid={`button-mark-sold-${product.id}`}
            >
              Mark Sold
            </ConfirmButton>
            <ConfirmButton
              variant="destructive"
              size="sm"
              className="flex-1"
              onConfirm={() => onRemove(product.id)}
              confirmTitle="Remove item?"
              confirmDescription="This will remove the item and clear its buyer queue."
              data-testid={`button-remove-${product.id}`}
            >
              Remove
            </ConfirmButton>
          </div>
        </CardFooter>
      )}

      {product.status === "sold" && (
        <CardFooter className="p-4 pt-0">
          <ConfirmButton
            variant="destructive"
            size="sm"
            className="w-full"
            onConfirm={() => onRemove(product.id)}
            confirmTitle="Remove sold item?"
            confirmDescription="This will permanently remove the item from your listings."
            data-testid={`button-remove-${product.id}`}
          >
            Remove
          </ConfirmButton>
        </CardFooter>
      )}
    </Card>
  );
}

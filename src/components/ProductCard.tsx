import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Clock, DollarSign, Users, ChevronDown, ChevronUp, CalendarDays } from "lucide-react";
import type { Product, BuyerInterest } from "@/pages/Home";
import type { ProductImage } from "@/pages/Home";
import type { Listing } from "@/types/listing";
import { BuyerQueueItem } from "./BuyerQueueItem";
// Removed AddBuyerDialog: buyers now self-register via interest dialog
import { ShareProductDialog } from "./ShareProductDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface ProductCardProps {
  product: Product;
  listing?: Listing;
  isOwner?: boolean; // True when viewing own products (admin view)
  onMarkSold: (productId: string) => void;
  onRemove: (productId: string) => void;
}

export function ProductCard({ product, listing, isOwner = false, onMarkSold, onRemove }: ProductCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { data: buyers = [] } = useQuery<BuyerInterest[]>({
    queryKey: ["/api/buying-queue/product", product.id],
    queryFn: async () => apiRequest("GET", `/api/buying-queue/product/${product.id}`),
  });
  const { data: me } = useQuery<{ email?: string; id?: string }>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => apiRequest("GET", "/api/auth/me"),
    staleTime: Infinity,
  });
  
  // Check if current user is the actual owner of this product
  const isProductOwner = me?.id === product.accountId;
  
  // Backend returns statuses like PENDING, MISSED, etc.
  const activeBuyers = buyers
    .filter(b => b.status !== "MISSED")
    .sort((a, b) => (a.queuePosition ?? 0) - (b.queuePosition ?? 0));
  const nextBuyer = activeBuyers[0];
  const missedBuyers = buyers.filter(b => b.status === "MISSED");
  const { toast } = useToast();
  const [interestOpen, setInterestOpen] = useState(false);
  const [editingInterest, setEditingInterest] = useState(false);
  const [pickupTime, setPickupTime] = useState("");
  const [offerPrice, setOfferPrice] = useState("0");
  const [isFree, setIsFree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  // Get my current interest if it exists
  const myInterest = buyers.find(b => b.buyerEmail === me?.email);
  const hasMyInterest = !!myInterest;
  const isApproved = myInterest?.status === "APPROVED";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "bg-success text-success-foreground";
      case "SOLD":
        return "bg-primary text-primary-foreground";
      case "REMOVED":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const handleApprove = async (queueId: string) => {
    try {
      await apiRequest("POST", `/api/buying-queue/approve?queueId=${queueId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/buying-queue/product", product.id] });
      toast({
        title: "Interest approved",
        description: "Buyer has been approved for pickup",
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e?.message || "Failed to approve interest",
      });
    }
  };

  const handleDeny = async (queueId: string) => {
    try {
      await apiRequest("POST", `/api/buying-queue/deny?queueId=${queueId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/buying-queue/product", product.id] });
      toast({
        title: "Interest denied",
        description: "Buyer has been removed from the queue",
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e?.message || "Failed to deny interest",
      });
    }
  };

  const handleOpenInterest = async () => {
    if (product.status !== "AVAILABLE") return;
    // Check auth
    try {
      const me = await apiRequest("GET", "/api/auth/me");
      if (!me || !me.email) throw new Error("Not authenticated");
      setInterestOpen(true);
    } catch {
      // Redirect to landing to auth then return
      sessionStorage.setItem("postAuthRedirect", "/home");
      toast({
        title: "Please sign up or log in",
        description: "You need an account to join the interest queue",
      });
      window.location.href = "/";
    }
  };

  const handleSubmitInterest = async () => {
    if (!pickupTime) {
      toast({
        variant: "destructive",
        title: "Pickup time required",
        description: "Select a pickup time to proceed",
      });
      return;
    }
    setSubmitting(true);
    try {
      const pickupDate = new Date(pickupTime);
      const priceNumber = parseFloat(offerPrice || "0");
      await apiRequest("POST", "/api/buying-queue", {
        productId: product.id,
        pickupTime: pickupDate,
        offerPrice: isFree ? null : Math.round(priceNumber * 100),
      });
      setInterestOpen(false);
      setPickupTime("");
      setOfferPrice("0");
      setIsFree(false);
      queryClient.invalidateQueries({ queryKey: ["/api/buying-queue/product", product.id] });
      toast({
        title: "Interest registered",
        description: "You have been added to the queue",
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e?.message || "Failed to register interest",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditInterest = () => {
    if (myInterest) {
      // Pre-fill with current values
      const pickupDate = new Date(myInterest.pickupTime);
      const localDateTime = new Date(pickupDate.getTime() - pickupDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setPickupTime(localDateTime);
      setOfferPrice(myInterest.offerPrice ? (myInterest.offerPrice / 100).toString() : "0");
      setIsFree(!myInterest.offerPrice);
      setEditingInterest(true);
      setInterestOpen(true);
    }
  };

  const handleUpdateInterest = async () => {
    if (!pickupTime) {
      toast({
        variant: "destructive",
        title: "Pickup time required",
        description: "Select a pickup time to proceed",
      });
      return;
    }
    
    if (!myInterest) return;
    
    setSubmitting(true);
    try {
      const pickupDate = new Date(pickupTime);
      const priceNumber = parseFloat(offerPrice || "0");
      
      // Update the interest - if approved, will reset to pending
      await apiRequest("PUT", "/api/buying-queue", {
        id: myInterest.id,
        productId: product.id,
        pickupTime: pickupDate,
        offerPrice: isFree ? null : Math.round(priceNumber * 100),
        status: isApproved ? "PENDING" : myInterest.status, // Reset to pending if was approved
      });
      
      setInterestOpen(false);
      setEditingInterest(false);
      setPickupTime("");
      setOfferPrice("0");
      setIsFree(false);
      queryClient.invalidateQueries({ queryKey: ["/api/buying-queue/product", product.id] });
      
      if (isApproved) {
        toast({
          title: "Interest updated",
          description: "Your changes moved you back to pending status for re-approval",
        });
      } else {
        toast({
          title: "Interest updated",
          description: "Your pickup time and offer have been updated",
        });
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e?.message || "Failed to update interest",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawInterest = async () => {
    if (!me?.email) {
      // Not logged in; route to auth
      sessionStorage.setItem("postAuthRedirect", "/home");
      toast({
        title: "Please sign up or log in",
        description: "You need an account to manage your interest",
      });
      window.location.href = "/";
      return;
    }
    setWithdrawing(true);
    try {
      await apiRequest("DELETE", `/api/buying-queue/product/${product.id}/remove-interest`);
      queryClient.invalidateQueries({ queryKey: ["/api/buying-queue/product", product.id] });
      toast({
        title: "Interest removed",
        description: "You have been removed from the queue",
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e?.message || "Failed to remove interest",
      });
    } finally {
      setWithdrawing(false);
    }
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
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-foreground" data-testid={`text-price-${product.id}`}>{formatPrice(product.price)}</span>
        </div>

        {activeBuyers.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span data-testid={`text-buyer-count-${product.id}`}>{activeBuyers.length} interested buyer{activeBuyers.length !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Show approved buyer waiting for pickup */}
        {product.status === "AVAILABLE" && nextBuyer && nextBuyer.status === "APPROVED" && (
          <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <div className="flex-1 min-w-0">
                {nextBuyer.buyerEmail === me?.email ? (
                  <>
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                      You're approved for pickup!
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                      Pickup time: {format(new Date(nextBuyer.pickupTime), "MMM d, h:mm a")}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                      Someone is picking this up
                    </p>
                    {activeBuyers.length > 1 && (
                      <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                        Get in queue if they don't show up
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

  {product.status === "AVAILABLE" && (
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
                    isOwner={isOwner}
                    onApprove={handleApprove}
                    onDeny={handleDeny}
                  />
                ))}
                {missedBuyers.map((buyer) => (
                  <BuyerQueueItem
                    key={buyer.id}
                    buyer={buyer}
                    isNext={false}
                    isOwner={isOwner}
                    onApprove={handleApprove}
                    onDeny={handleDeny}
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

      {/* Admin/Owner Controls */}
      {product.status === "AVAILABLE" && isOwner && (
        <CardFooter className="p-4 pt-0 flex flex-col gap-2">
          {listing ? (
            <ShareProductDialog
              listingId={listing.id}
              listingKey={listing.key}
              listingName={listing.name}
            />
          ) : (
            <div className="text-xs text-muted-foreground text-center py-2">
              Add item to a listing to enable sharing
            </div>
          )}
          <div className="flex gap-2 w-full">
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => onMarkSold(product.id)}
              data-testid={`button-mark-sold-${product.id}`}
            >
              Mark Sold
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={() => onRemove(product.id)}
              data-testid={`button-remove-${product.id}`}
            >
              Remove
            </Button>
          </div>
        </CardFooter>
      )}

      {/* Buyer Interest Controls - only when NOT owner */}
      {product.status === "AVAILABLE" && !isOwner && listing && !isProductOwner && (
        <CardFooter className="p-4 pt-0 flex flex-col gap-2">
          {hasMyInterest ? (
            <>
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleEditInterest}
                  data-testid={`button-edit-interest-${product.id}`}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleWithdrawInterest}
                  disabled={withdrawing}
                  data-testid={`button-withdraw-interest-${product.id}`}
                >
                  {withdrawing ? "Withdrawing..." : "Withdraw"}
                </Button>
              </div>
              {isApproved && (
                <p className="text-xs text-muted-foreground text-center">
                  Editing your interest will reset it to pending status
                </p>
              )}
            </>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={handleOpenInterest}
              data-testid={`button-express-interest-${product.id}`}
            >
              I'm Interested
            </Button>
          )}
          <ShareProductDialog
            listingId={listing.id}
            listingKey={listing.key}
            listingName={listing.name}
          />
        </CardFooter>
      )}

      {/* Show share button for product owners viewing through listing page */}
      {product.status === "AVAILABLE" && !isOwner && listing && isProductOwner && (
        <CardFooter className="p-4 pt-0 flex flex-col gap-2">
          <div className="text-xs text-muted-foreground text-center py-2 bg-muted/30 rounded">
            You own this item
          </div>
          <ShareProductDialog
            listingId={listing.id}
            listingKey={listing.key}
            listingName={listing.name}
          />
        </CardFooter>
      )}

      {product.status === "SOLD" && (
        <CardFooter className="p-4 pt-0 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid={`text-sold-date-${product.id}`}> 
            <CalendarDays className="w-4 h-4" />
            <span>
              Sold on {(() => {
                const dateStr = product.updatedAt || product.createdAt;
                try {
                  return format(new Date(dateStr), "MMM d, h:mm a");
                } catch {
                  return dateStr || "Unknown date";
                }
              })()}
            </span>
          </div>
        </CardFooter>
      )}

      {/* Interest Dialog */}
      <Dialog open={interestOpen} onOpenChange={(open) => {
        setInterestOpen(open);
        if (!open) {
          // Reset form when closing
          setEditingInterest(false);
          setPickupTime("");
          setOfferPrice("0");
          setIsFree(false);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingInterest ? "Edit Interest" : "I'm Interested"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pickupTime">Pickup Time</Label>
              <Input
                id="pickupTime"
                type="datetime-local"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                data-testid={`input-pickup-${product.id}`}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="isFree">Is Free?</Label>
                <Switch id="isFree" checked={isFree} onCheckedChange={setIsFree} />
              </div>
              {!isFree && (
                <div className="space-y-1">
                  <Label htmlFor="offerPrice">Offer Price ($)</Label>
                  <Input
                    id="offerPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    data-testid={`input-offer-${product.id}`}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setInterestOpen(false);
                  setEditingInterest(false);
                  setPickupTime("");
                  setOfferPrice("0");
                  setIsFree(false);
                }}
                data-testid={`button-cancel-interest-${product.id}`}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={submitting}
                onClick={editingInterest ? handleUpdateInterest : handleSubmitInterest}
                data-testid={`button-submit-interest-${product.id}`}
              >
                {submitting ? (editingInterest ? "Updating..." : "Submitting...") : (editingInterest ? "Update" : "Submit")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

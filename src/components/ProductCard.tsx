import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Package, Clock, DollarSign, Users, ChevronDown, ChevronUp, CalendarDays, MapPin, MessageSquare } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import type { Product, BuyerInterest } from "@/pages/Home";
import type { ProductImage } from "@/pages/Home";
import type { Listing } from "@/types/listing";
import { BuyerQueueItem } from "./BuyerQueueItem";
// Removed AddBuyerDialog: buyers now self-register via interest dialog
import { ShareProductDialog } from "./ShareProductDialog";
import { MessageThread } from "./MessageThread";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AuthForm } from "./AuthForm";
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
  const [currentSlide, setCurrentSlide] = useState(0);
  const [carouselApi, setCarouselApi] = useState<any>(null);
  const { data: buyers = [] } = useQuery<BuyerInterest[]>({
    queryKey: ["/api/buying-queue/product", product.id],
    queryFn: async () => apiRequest("GET", `/api/buying-queue/product/${product.id}`),
  });
  const { data: me } = useQuery<{ email?: string; id?: string }>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => apiRequest("GET", "/api/auth/me"),
    staleTime: 60_000,
  });
  
  // Check if current user is the actual owner of this product
  const isProductOwner = me?.id === product.ownerId;

  // Get conversations for unread message indicators
  type Conversation = {
    id: string;
    participantId: string;
    unreadCount: number;
  };
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    queryFn: async () => apiRequest("GET", "/api/conversations"),
    enabled: !!me?.id,
    staleTime: 10_000, // Refresh every 10 seconds
  });

  // Helper to get unread count for a specific user
  const getUnreadCount = (userId: string) => {
    const conv = conversations.find(c => c.participantId === userId);
    return conv?.unreadCount || 0;
  };
  
  // Backend returns statuses like PENDING, MISSED, etc.
  const activeBuyers = buyers
    .filter(b => b.status !== "MISSED" && b.status !== "DENIED" && b.status !== "WITHDRAW" && b.status !== "WITHDRAWN")
    .sort((a, b) => (a.queuePosition ?? 0) - (b.queuePosition ?? 0));
  const nextBuyer = activeBuyers[0];
  const missedBuyers = buyers.filter(b => b.status === "MISSED");
  const deniedBuyers = buyers.filter(b => b.status === "DENIED");
  const withdrawnBuyers = buyers.filter(b => b.status === "WITHDRAW" || b.status === "WITHDRAWN");
  const { toast } = useToast();
  const [interestOpen, setInterestOpen] = useState(false);
  const [editingInterest, setEditingInterest] = useState(false);
  const [pickupTime, setPickupTime] = useState("");
  const [offerPrice, setOfferPrice] = useState("0");
  const [isFree, setIsFree] = useState(false);
  const [hideOffer, setHideOffer] = useState(false);
  const [shareContact, setShareContact] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [justWithdrew, setJustWithdrew] = useState(false); // suppress edit/withdraw buttons immediately after withdrawal until refetch
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [showMessageThread, setShowMessageThread] = useState(false);
  const [messageRecipientId, setMessageRecipientId] = useState<string | undefined>();

  // Get my current interest if it exists (prefer stored id, fallback to email match)
  const storedInterestId = (typeof window !== 'undefined') ? sessionStorage.getItem(`my_interest_${product.id}`) || undefined : undefined;
  // All interests belonging to current user (may include withdrawn/denied history)
  const myInterests = buyers.filter(b => (b.buyerEmail && me?.email) ? b.buyerEmail.toLowerCase() === me.email.toLowerCase() : false);
  // Prefer stored interest if it still exists, otherwise prefer a pending, otherwise approved, otherwise latest by updatedAt
  const pendingInterest = myInterests.find(b => b.status === 'PENDING');
  const approvedInterest = myInterests.find(b => b.status === 'APPROVED');
  const deniedInterest = myInterests.find(b => b.status === 'DENIED');
  const storedInterest = buyers.find(b => storedInterestId && b.id === storedInterestId);
  const myInterest = storedInterest || pendingInterest || approvedInterest || myInterests.sort((a,b)=>{
    const at = new Date(a.updatedAt || a.createdAt).getTime();
    const bt = new Date(b.updatedAt || b.createdAt).getTime();
    return bt - at; // latest first
  })[0];
  // Treat withdrawn/withdrawn interests as effectively not active for gating
  const isWithdrawn = myInterest?.status === 'WITHDRAW' || myInterest?.status === 'WITHDRAWN';
  const isDenied = myInterest?.status === 'DENIED';
  const isApproved = myInterest?.status === 'APPROVED';
  const hasPendingMine = !!pendingInterest; // only show edit/withdraw when there is a pending interest
  const hasMyInterest = !!myInterest && !isWithdrawn; // active interest excluding withdrawn
  const isNextMe = !!(nextBuyer && (
    (storedInterestId && nextBuyer.id === storedInterestId) ||
    ((nextBuyer?.buyerEmail && me?.email) && nextBuyer.buyerEmail.toLowerCase() === me.email.toLowerCase())
  ));

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

  // Backend supplies product.price as decimal dollars (e.g., 25.50)
  const formatPrice = (amount: number) => {
    return `$${Number(amount).toFixed(2)}`;
  };

  const handleApprove = async (queueId: string, opts?: { shareAddress?: boolean }) => {
    try {
      // Always include shareAddress flag to satisfy backend expectation
      const params = new URLSearchParams({
        queueId,
        shareAddress: String(!!opts?.shareAddress),
      });
      await apiRequest("POST", `/api/buying-queue/approve?${params.toString()}`);
      queryClient.invalidateQueries({ queryKey: ["/api/buying-queue/product", product.id] });
      toast({
        title: "Interest approved",
        description: "Buyer has been approved for pickup" + (opts?.shareAddress ? " and received the pickup address" : ""),
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
      // Show inline signup dialog instead of redirecting
      // Preserve public listing key for post-auth auto-grant
      if (listing) {
        const storageKey = `listing_key_${listing.id}`;
        sessionStorage.setItem(storageKey, listing.key);
        // Always redirect back to the full listing URL with key preserved
        const listingUrlWithKey = `/listing/${listing.id}?k=${encodeURIComponent(listing.key)}`;
        sessionStorage.setItem("postAuthRedirect", listingUrlWithKey);
      } else {
        // If not inside a listing context, keep existing or fallback to home
        const existing = sessionStorage.getItem("postAuthRedirect");
        if (!existing) sessionStorage.setItem("postAuthRedirect", "/home");
      }
      // Open inline auth dialog instead of redirecting
      setAuthMode('signup');
      setShowAuthDialog(true);
    }
  };

  const handleMessageSeller = async () => {
    // Check auth first
    try {
      const user = await apiRequest("GET", "/api/auth/me");
      if (!user || !user.email) throw new Error("Not authenticated");
      setMessageRecipientId(product.ownerId);
      setShowMessageThread(true);
    } catch {
      // Show inline auth dialog
      setAuthMode('login');
      setShowAuthDialog(true);
    }
  };

  const handleMessageBuyer = async (buyerId: string) => {
    try {
      const user = await apiRequest("GET", "/api/auth/me");
      if (!user || !user.email) throw new Error("Not authenticated");
      setMessageRecipientId(buyerId);
      setShowMessageThread(true);
    } catch {
      setAuthMode('login');
      setShowAuthDialog(true);
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
  // Backend expects a decimal (e.g., 25.50), not cents
  const priceNumber = Math.round(parseFloat(offerPrice || "0") * 100) / 100;
      const created = await apiRequest("POST", "/api/buying-queue", {
        productId: product.id,
        pickupTime: pickupDate,
  offerPrice: isFree ? null : priceNumber,
        hideMe: hideOffer,
        shareContact: shareContact,
      });
      if (created?.id) {
        sessionStorage.setItem(`my_interest_${product.id}`, created.id);
      }
      // New interest means we are no longer in a just-withdrew state
      setJustWithdrew(false);
      setInterestOpen(false);
      setPickupTime("");
    setOfferPrice("0");
    setIsFree(false);
    setHideOffer(false);
    setShareContact(false);
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
    // Allow editing when PENDING or APPROVED (and optionally DENIED to resubmit)
    const editTarget = pendingInterest || approvedInterest || deniedInterest;
    if (editTarget) {
      // Pre-fill with current values
      const pickupDate = new Date(editTarget.pickupTime);
      const localDateTime = new Date(pickupDate.getTime() - pickupDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setPickupTime(localDateTime);
      setOfferPrice(editTarget.offerPrice ? (editTarget.offerPrice).toString() : "0");
      setIsFree(!editTarget.offerPrice);
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
    
  // Identify current editable interest (pending/approved/denied) and reset it to pending on update
  const editTarget = pendingInterest || approvedInterest || deniedInterest;
  if (!editTarget) return;
    
    setSubmitting(true);
    try {
  const pickupDate = new Date(pickupTime);
  // Backend expects a decimal (e.g., 25.50), not cents
  const priceNumber = Math.round(parseFloat(offerPrice || "0") * 100) / 100;
      
      // Update the interest - if approved or denied, will reset to pending for re-review
      const updated = await apiRequest("PUT", "/api/buying-queue", {
        id: editTarget.id,
        productId: product.id,
        pickupTime: pickupDate,
        offerPrice: isFree ? null : priceNumber,
        hideMe: hideOffer,
        shareContact: shareContact,
        status: 'PENDING', // remain pending on edit
      });
      if (updated?.id) {
        sessionStorage.setItem(`my_interest_${product.id}`, updated.id);
      }
      
      setInterestOpen(false);
      setEditingInterest(false);
      setPickupTime("");
    setOfferPrice("0");
    setIsFree(false);
    setHideOffer(false);
    setShareContact(false);
      queryClient.invalidateQueries({ queryKey: ["/api/buying-queue/product", product.id] });
      
      if (isApproved || isDenied) {
        toast({
          title: "Interest updated",
          description: "Your changes moved you back to pending status for owner review",
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
      // Optimistically remove any of the user's interests for this product from cache so UI updates instantly
      queryClient.setQueryData<BuyerInterest[]>(["/api/buying-queue/product", product.id], (old) => {
        if (!old) return old;
        return old.filter(b => !((b.buyerEmail && me?.email) && b.buyerEmail.toLowerCase() === me.email.toLowerCase()));
      });
      await apiRequest("DELETE", `/api/buying-queue/product/${product.id}/remove-interest`);
      // Clear stored interest id so a withdrawn/denied interest doesn't keep gating incorrectly
      sessionStorage.removeItem(`my_interest_${product.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/buying-queue/product", product.id] });
      toast({
        title: "Interest removed",
        description: "You have been removed from the queue",
      });
      setJustWithdrew(true);
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

  const handleShareContact = async (queueId: string) => {
    const interest = buyers.find(b => b.id === queueId);
    if (!interest) return;
    try {
      await apiRequest("PUT", "/api/buying-queue", {
        id: interest.id,
        productId: product.id,
        pickupTime: interest.pickupTime,
        offerPrice: interest.offerPrice ?? null,
        hideMe: interest.hideMe,
        shareContact: true,
        status: interest.status,
      });
      if (interest.id) sessionStorage.setItem(`my_interest_${product.id}`, interest.id);
      queryClient.invalidateQueries({ queryKey: ["/api/buying-queue/product", product.id] });
      toast({ title: "Contact shared", description: "Owner can now view your contact details." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e?.message || "Failed to share contact" });
    }
  };

  // Track current slide for dots indicator when carousel is present
  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => {
      try {
        const idx = carouselApi.selectedScrollSnap();
        setCurrentSlide(typeof idx === 'number' ? idx : 0);
      } catch {
        // noop
      }
    };
    onSelect();
    carouselApi.on("select", onSelect);
    carouselApi.on("reInit", onSelect);
    return () => {
      try {
        carouselApi.off("select", onSelect);
        carouselApi.off("reInit", onSelect);
      } catch {
        // ignore
      }
    };
  }, [carouselApi]);

  return (
    <Card className="overflow-hidden hover-elevate" data-testid={`card-product-${product.id}`}>
      <div className="relative">
        {product.images && product.images.length > 0 ? (
          product.images.length === 1 ? (
            <div className="relative w-full aspect-square bg-muted">
              <img
                src={product.images[0].url}
                alt={`${product.title} - Image 1`}
                className="absolute w-full h-full object-cover"
                data-testid={`img-product-${product.id}-0`}
              />
            </div>
          ) : (
            <Carousel className="w-full" opts={{ loop: product.images.length > 1 }} setApi={setCarouselApi}>
              <CarouselContent className="aspect-square">
                {product.images.map((image: ProductImage, index) => (
                  <CarouselItem key={index} className="p-0">
                    <div className="relative w-full h-full bg-muted">
                      <img
                        src={image.url}
                        alt={`${product.title} - Image ${index + 1}`}
                        className="absolute inset-0 w-full h-full object-cover"
                        data-testid={`img-product-${product.id}-${index}`}
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="-left-3 top-1/2 -translate-y-1/2 bg-background/70 backdrop-blur-sm border" />
              <CarouselNext className="-right-3 top-1/2 -translate-y-1/2 bg-background/70 backdrop-blur-sm border" />
              {/* Dots indicator */}
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
                {product.images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => carouselApi?.scrollTo(i)}
                    className={cn(
                      "h-2.5 w-2.5 rounded-full border border-white/60 transition-colors",
                      i === currentSlide ? "bg-white" : "bg-white/20"
                    )}
                    aria-label={`Go to image ${i + 1}`}
                  />
                ))}
              </div>
            </Carousel>
          )
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

        {/* Show pickup address to buyer if their interest has one (shared by owner) */}
        {!isOwner && myInterest?.pickupAddress && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 border border-border rounded-md p-2" data-testid={`div-pickup-address-${product.id}`}>
            <MapPin className="w-4 h-4 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-medium text-foreground">Pickup Address</p>
              <p className="text-xs break-words" data-testid={`text-pickup-address-${product.id}`}>{myInterest.pickupAddress}</p>
            </div>
          </div>
        )}

        {/* Show approved buyer waiting for pickup */}
        {product.status === "AVAILABLE" && nextBuyer && nextBuyer.status === "APPROVED" && (
          <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md" data-testid={`div-approved-banner-${product.id}`}>
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <div className="flex-1 min-w-0">
                {isNextMe ? (
                  <>
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400" data-testid={`text-approved-self-${product.id}`}>
                      You're approved for pickup!
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-500 mt-0.5" data-testid={`text-approved-self-time-${product.id}`}>
                      Pickup time: {format(new Date(nextBuyer.pickupTime), "MMM d, h:mm a")}
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-400 mt-0.5" data-testid={`text-approved-self-price-${product.id}`}>
                      Your price: {nextBuyer.offerPrice == null ? "FREE" : `$${Number(nextBuyer.offerPrice).toFixed(2)}`}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400" data-testid={`text-approved-owner-${product.id}`}>
                      {(isOwner || isProductOwner) ? `${nextBuyer.buyerName || "Buyer"} is picking this up` : "Someone is picking this up"}
                    </p>
                    {activeBuyers.length > 1 && (
                      <p className="text-xs text-green-600 dark:text-green-500 mt-0.5" data-testid={`text-approved-queuehint-${product.id}`}>
                        Get in queue if they don't show up
                      </p>
                    )}
                    {isOwner && (
                      <p className="text-xs text-green-700 dark:text-green-400 mt-1" data-testid={`text-approved-owner-price-${product.id}`}>
                        Approved price: {nextBuyer.offerPrice == null ? "FREE" : `$${Number(nextBuyer.offerPrice).toFixed(2)}`}
                      </p>
                    )}
                    {isOwner && nextBuyer.pickupAddress && (
                      <p className="text-xs flex items-center gap-1 text-green-700 dark:text-green-400 mt-1" data-testid={`text-approved-address-shared-${product.id}`}>
                        <MapPin className="w-3 h-3" /> Pickup address shared
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
                {activeBuyers.map((buyer, index) => {
                  const isSelf = !!(
                    (storedInterestId && buyer.id === storedInterestId) ||
                    (buyer.buyerEmail && me?.email && buyer.buyerEmail.toLowerCase() === me.email.toLowerCase())
                  );
                  return (
                    <BuyerQueueItem
                      key={buyer.id}
                      buyer={buyer}
                      isNext={index === 0}
                      isOwner={isOwner || isProductOwner}
                      isSelf={isSelf}
                      ownerAddress={listing?.pickupAddress || product.location || undefined}
                      onApprove={handleApprove}
                      onDeny={handleDeny}
                      onShareContact={handleShareContact}
                      onMessageBuyer={handleMessageBuyer}
                      unreadCount={buyer.buyerId ? getUnreadCount(buyer.buyerId) : 0}
                      onMessageOwner={handleMessageSeller}
                      ownerId={product.ownerId}
                    />
                  );
                })}
                {missedBuyers.map((buyer) => {
                  const isSelf = !!(
                    (storedInterestId && buyer.id === storedInterestId) ||
                    (buyer.buyerEmail && me?.email && buyer.buyerEmail.toLowerCase() === me.email.toLowerCase())
                  );
                  return (
                    <BuyerQueueItem
                      key={buyer.id}
                      buyer={buyer}
                      isNext={false}
                      isOwner={isOwner || isProductOwner}
                      isSelf={isSelf}
                      ownerAddress={listing?.pickupAddress || product.location || undefined}
                      onApprove={handleApprove}
                      onDeny={handleDeny}
                      onShareContact={handleShareContact}
                      onMessageBuyer={handleMessageBuyer}
                      unreadCount={buyer.buyerId ? getUnreadCount(buyer.buyerId) : 0}
                      onMessageOwner={handleMessageSeller}
                      ownerId={product.ownerId}
                    />
                  );
                })}
                {withdrawnBuyers.map((buyer) => {
                  const isSelf = !!(
                    (storedInterestId && buyer.id === storedInterestId) ||
                    (buyer.buyerEmail && me?.email && buyer.buyerEmail.toLowerCase() === me.email.toLowerCase())
                  );
                  // Show withdrawn only to owner/admin or the withdrawn buyer
                  if (!(isOwner || isProductOwner) && !isSelf) return null;
                  return (
                    <BuyerQueueItem
                      key={buyer.id}
                      buyer={buyer}
                      isNext={false}
                      isOwner={isOwner || isProductOwner}
                      isSelf={isSelf}
                      ownerAddress={listing?.pickupAddress || product.location || undefined}
                      onApprove={handleApprove}
                      onDeny={handleDeny}
                      onShareContact={handleShareContact}
                      onMessageBuyer={handleMessageBuyer}
                      unreadCount={buyer.buyerId ? getUnreadCount(buyer.buyerId) : 0}
                      onMessageOwner={handleMessageSeller}
                      ownerId={product.ownerId}
                    />
                  );
                })}
                {deniedBuyers.map((buyer) => {
                  const isSelf = !!(
                    (storedInterestId && buyer.id === storedInterestId) ||
                    (buyer.buyerEmail && me?.email && buyer.buyerEmail.toLowerCase() === me.email.toLowerCase())
                  );
                  // Only render denied interest for owner or the denied buyer themselves
                  if (!(isOwner || isProductOwner) && !isSelf) return null;
                  return (
                    <BuyerQueueItem
                      key={buyer.id}
                      buyer={buyer}
                      isNext={false}
                      isOwner={isOwner || isProductOwner}
                      isSelf={isSelf}
                      ownerAddress={listing?.pickupAddress || product.location || undefined}
                      onApprove={handleApprove}
                      onDeny={handleDeny}
                      onShareContact={handleShareContact}
                      onMessageBuyer={handleMessageBuyer}
                      unreadCount={buyer.buyerId ? getUnreadCount(buyer.buyerId) : 0}
                      onMessageOwner={handleMessageSeller}
                      ownerId={product.ownerId}
                    />
                  );
                })}
                {activeBuyers.length === 0 && missedBuyers.length === 0 && deniedBuyers.length === 0 && withdrawnBuyers.length === 0 && (
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
            <ConfirmButton
              variant="default"
              size="sm"
              className="flex-1"
              onConfirm={() => onMarkSold(product.id)}
              confirmTitle="Mark as Sold?"
              confirmDescription="This will mark the item as sold and move it to the Sold tab."
              data-testid={`button-mark-sold-${product.id}`}
            >
              Mark Sold
            </ConfirmButton>
            <ConfirmButton
              variant="destructive"
              size="sm"
              className="flex-1"
              onConfirm={() => onRemove(product.id)}
              confirmTitle="Remove Item?"
              confirmDescription="This will permanently delete the item and its images. This action cannot be undone."
              data-testid={`button-remove-${product.id}`}
            >
              Remove
            </ConfirmButton>
          </div>
        </CardFooter>
      )}

      {/* Buyer Interest Controls - only when NOT owner */}
      {product.status === "AVAILABLE" && !isOwner && listing && !isProductOwner && (
        <CardFooter className="p-4 pt-0 flex flex-col gap-2">
          {(hasPendingMine || isApproved) && !justWithdrew ? (
            <>
              <div className="flex flex-col gap-1 w-full">
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
              </div>
            </>
          ) : (
            // Only show "I'm Interested" when user doesn't already have an approved interest
            !isApproved && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={handleOpenInterest}
                  data-testid={`button-express-interest-${product.id}`}
                >
                  I'm Interested
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMessageSeller}
                  data-testid={`button-message-seller-${product.id}`}
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </div>
            )
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
          setHideOffer(false);
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
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="hideOffer">Hide my offer?</Label>
                  <Switch id="hideOffer" checked={hideOffer} onCheckedChange={setHideOffer} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Hidden offers are visible to the owner only.
                </p>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="shareContact">Share my contact?</Label>
                  <Switch id="shareContact" checked={shareContact} onCheckedChange={setShareContact} />
                </div>
                <p className="text-xs text-muted-foreground">
                  If enabled, owner can view your email/phone for coordination.
                </p>
              </div>
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

      {/* Auth Dialog for unauthenticated buyers */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Join the interest queue</DialogTitle>
            <p className="text-sm text-muted-foreground text-center pt-2">
              Create an account to show your interest in this item
            </p>
          </DialogHeader>
          <AuthForm 
            mode={authMode} 
            onSuccess={async () => {
              // After signup/login, check if user is actually authenticated
              try {
                const user = await apiRequest("GET", "/api/auth/me");
                if (user && user.email) {
                  // User is logged in (OAuth or email verified)
                  setShowAuthDialog(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                  setTimeout(() => {
                    setInterestOpen(true);
                  }, 300);
                } else {
                  // Should not happen, but handle gracefully
                  setShowAuthDialog(false);
                }
              } catch (e) {
                // Not authenticated - likely email not verified
                // The AuthForm already shows the verification message for signup
                // For login with unverified email, the error is already handled
                setShowAuthDialog(false);
              }
            }}
          />
          <div className="text-center pb-2">
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              {authMode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Log in'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Message Thread Dialog */}
      <MessageThread
        recipientId={messageRecipientId}
        productId={product.id}
        open={showMessageThread}
        onOpenChange={setShowMessageThread}
      />
    </Card>
  );
}

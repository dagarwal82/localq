import { useState } from "react";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Clock, DollarSign, Mail, ChevronDown, ChevronUp, Check, X, EyeOff, MapPin, Share2 } from "lucide-react";
import type { BuyerInterest } from "../pages/Home";
import { format } from "date-fns";

interface BuyerQueueItemProps {
  buyer: BuyerInterest;
  isNext: boolean;
  isOwner?: boolean;
  /** True if the viewer is the same person as the buyer (matches their email) */
  isSelf?: boolean;
  onApprove?: (queueId: string, opts?: { shareAddress?: boolean }) => void;
  onDeny?: (queueId: string) => void;
  ownerAddress?: string; // address available for owner to optionally share
  onShareContact?: (queueId: string) => void;
}

export function BuyerQueueItem({ buyer, isNext, isOwner = false, isSelf = false, onApprove, onDeny, ownerAddress, onShareContact }: BuyerQueueItemProps) {
  const [showContact, setShowContact] = useState(false);
  const [shareAddress, setShareAddress] = useState(false); // owner choosing to share pickup address pre-approval
  
  const formatPrice = (cents: number | null) => {
    if (cents === null) return "FREE";
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.split("@")[0].slice(0, 2).toUpperCase();
  };

  const isMissed = buyer.status === "MISSED";
  const isPending = buyer.status === "PENDING";
  const isApproved = buyer.status === "APPROVED";
  const isDenied = buyer.status === "DENIED";
  const bgClass = isApproved 
    ? "bg-green-50 dark:bg-green-950/10 border-green-200 dark:border-green-800" 
    : isNext && !isDenied && !isMissed 
    ? "bg-warning/10" 
    : isDenied 
    ? "bg-red-50 dark:bg-red-950/10 border-red-200 dark:border-red-800" 
    : "";
  const hasContact = !!buyer.buyerEmail || !!buyer.phone;
  // Only owners can see contact if buyer opted-in, and buyers always see their own
  const canSeeContact = (isSelf || (isOwner && buyer.shareContact)) && hasContact;

  return (
    <div
      className={`rounded-md border border-border ${bgClass} ${(isMissed || isDenied) ? "opacity-50" : ""}`}
      data-testid={`div-buyer-${buyer.id}`}
    >
      <div className="flex items-center gap-3 p-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
            {canSeeContact ? getInitials(buyer.buyerEmail ?? "") : "?"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-base font-medium text-foreground ${(isMissed || isDenied) ? "line-through" : ""}`} data-testid={`text-buyer-name-${buyer.id}`}>
              {isOwner ? (buyer.buyerName || "Buyer") : (isSelf ? (buyer.buyerName || "You") : "Interested buyer")}
            </p>
            {isNext && !isMissed && (
              <Badge variant="default" className="text-xs bg-warning text-warning-foreground" data-testid={`badge-next-${buyer.id}`}>
                NEXT
              </Badge>
            )}
            {isMissed && (
              <Badge variant="destructive" className="text-xs" data-testid={`badge-missed-${buyer.id}`}>
                MISSED
              </Badge>
            )}
            {isDenied && (
              <Badge variant="destructive" className="text-xs" data-testid={`badge-denied-${buyer.id}`}>
                DENIED
              </Badge>
            )}
            {isPending && (
              <Badge variant="secondary" className="text-xs" data-testid={`badge-pending-${buyer.id}`}>
                PENDING
              </Badge>
            )}
            {isApproved && (
              <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-600 text-white" data-testid={`badge-approved-${buyer.id}`}>
                ✓ APPROVED
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span data-testid={`text-pickup-time-${buyer.id}`}>{format(new Date(buyer.pickupTime), "MMM d, h:mm a")}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {buyer.offerPrice !== null && <DollarSign className="w-4 h-4 text-muted-foreground" />}
            {buyer.hideMe && !isOwner ? (
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground" title="Offer hidden">
                <EyeOff className="w-4 h-4" /> Hidden
              </span>
            ) : (
              <span className={`text-base font-medium ${buyer.offerPrice === null ? "text-success" : "text-foreground"}`} data-testid={`text-offer-${buyer.id}`}>
                {formatPrice(buyer.offerPrice ?? null)}
              </span>
            )}
          </div>
          
          {canSeeContact && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setShowContact(!showContact)}
              data-testid={`button-toggle-contact-${buyer.id}`}
            >
              {showContact ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>

      {showContact && canSeeContact && (
        <div className="px-3 pb-3 space-y-2 border-t border-border pt-2" data-testid={`div-contact-${buyer.id}`}> 
          {buyer.buyerEmail && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              {canSeeContact ? (
                <a href={`mailto:${buyer.buyerEmail}`} className="hover:text-foreground" data-testid={`link-email-${buyer.id}`}>
                  {buyer.buyerEmail}
                </a>
              ) : (
                <span className="text-muted-foreground">Contact hidden</span>
              )}
            </div>
          )}
          {buyer.phone && canSeeContact && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Share2 className="w-4 h-4" />
              <span>{buyer.phone}</span>
            </div>
          )}
        </div>
      )}

      {/* Owner Actions - Show for pending interests */}
      {isOwner && isPending && onApprove && onDeny && (
        <div className="px-3 pb-3 flex gap-2 border-t border-border pt-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => onApprove(buyer.id, { shareAddress })}
            data-testid={`button-approve-${buyer.id}`}
          >
            <Check className="w-4 h-4 mr-1" />
            Approve
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="flex-1"
            onClick={() => onDeny(buyer.id)}
            data-testid={`button-deny-${buyer.id}`}
          >
            <X className="w-4 h-4 mr-1" />
            Deny
          </Button>
        </div>
      )}

      {/* Owner pre-approval address sharing controls */}
      {isOwner && isPending && ownerAddress && (
        <div className="px-3 pb-3 border-t border-border pt-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              className="h-3 w-3 rounded border-border"
              checked={shareAddress}
              onChange={(e) => setShareAddress(e.target.checked)}
            />
            Share pickup address ({ownerAddress}) with this buyer when approving
          </label>
        </div>
      )}

      {/* Show address to buyer once shared by owner (independent of contact visibility) */}
      {isSelf && buyer.pickupAddress && (
        <div className="px-3 pb-3 border-t border-border pt-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{buyer.pickupAddress}</span>
          </div>
        </div>
      )}

      {/* Buyer opt-in to share contact after interest creation */}
      {isSelf && !buyer.shareContact && buyer.status !== "MISSED" && onShareContact && (
        <div className="px-3 pb-3 border-t border-border pt-2">
          <Button size="sm" variant="secondary" onClick={() => onShareContact(buyer.id)} data-testid={`button-share-contact-${buyer.id}`}>
            Share my contact with owner
          </Button>
        </div>
      )}

      {/* Owner View - Approved buyer waiting for pickup */}
      {isOwner && isApproved && (
        <div className="px-3 pb-3 border-t border-border pt-2">
          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
            <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              Waiting for pickup
            </p>
          </div>

          {/* If address hasn't been shared yet, allow owner to share it post-approval */}
          {ownerAddress && !buyer.pickupAddress && onApprove && (
            <div className="mt-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onApprove(buyer.id, { shareAddress: true })}
                data-testid={`button-share-address-${buyer.id}`}
              >
                <MapPin className="w-4 h-4 mr-1" /> Share pickup address
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

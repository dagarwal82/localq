import { useState } from "react";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Clock, DollarSign, Mail, ChevronDown, ChevronUp, Check, X, EyeOff, MapPin, Share2, History, HelpCircle, MessageSquare } from "lucide-react";
import type { BuyerInterest } from "../pages/Home";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface BuyerQueueItemProps {
  buyer: BuyerInterest;
  isNext: boolean;
  isOwner?: boolean;
  /** True if the viewer is the same person as the buyer (matches their email) */
  isSelf?: boolean;
  onApprove?: (queueId: string, opts?: { shareAddress?: boolean }) => void;
  onDeny?: (queueId: string) => void;
  onRetract?: (queueId: string) => void;
  ownerAddress?: string; // address available for owner to optionally share
  onShareContact?: (queueId: string) => void;
  onMessageBuyer?: (buyerId: string) => void;
  unreadCount?: number; // Number of unread messages from this buyer
  onMessageOwner?: (ownerId: string) => void; // For buyers to message the owner
  ownerId?: string; // Product owner's ID for buyer messaging
}

export function BuyerQueueItem({ buyer, isNext, isOwner = false, isSelf = false, onApprove, onDeny, onRetract, ownerAddress, onShareContact, onMessageBuyer, unreadCount = 0, onMessageOwner, ownerId }: BuyerQueueItemProps) {
  const [showContact, setShowContact] = useState(false);
  const [shareAddress, setShareAddress] = useState(false); // owner choosing to share pickup address pre-approval
  const [showHistory, setShowHistory] = useState(false);
  
  const formatPrice = (amount: number | null) => {
    if (amount === null) return "FREE";
    return `$${Number(amount).toFixed(2)}`;
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.split("@")[0].slice(0, 2).toUpperCase();
  };

  const isMissed = buyer.status === "MISSED";
  const isPending = buyer.status === "PENDING";
  const isApproved = buyer.status === "APPROVED";
  const isDenied = buyer.status === "DENIED";
  const isWithdrawn = buyer.status === "WITHDRAW" || buyer.status === "WITHDRAWN";
  const bgClass = isApproved 
    ? "bg-green-50 dark:bg-green-950/10 border-green-200 dark:border-green-800" 
    : isNext && !isDenied && !isMissed && !isWithdrawn
    ? "bg-warning/10" 
    : isDenied 
    ? "bg-red-50 dark:bg-red-950/10 border-red-200 dark:border-red-800" 
    : isWithdrawn
    ? "bg-muted/30 dark:bg-muted/20 border-border" 
    : "";
  const hasContact = !!buyer.buyerEmail || !!buyer.phone;
  // Only owners can see contact if buyer opted-in, and buyers always see their own
  const canSeeContact = (isSelf || (isOwner && buyer.shareContact)) && hasContact;

  // History fetching (per-interest), only for owner or the buyer themselves
  type BuyingQueueHistory = {
    id?: string;
    priorStatus: string;
    newStatus: string;
    actorEmail?: string | null;
    offerPrice?: number | null; // cents (aligning with main API)
    pickupTime?: string | null; // ISO
    shareContact?: boolean;
    shareAddress?: boolean;
    createdAt?: string;
  };
  const { data: history = [], isLoading: historyLoading, error: historyError } = useQuery<BuyingQueueHistory[]>({
    queryKey: ["/api/buying-queue", buyer.id, "history"],
    queryFn: async () => apiRequest("GET", `/api/buying-queue/${buyer.id}/history`),
    enabled: (isOwner || isSelf) && showHistory,
  });

  return (
    <div
      className={`rounded-md border border-border ${bgClass} ${(isMissed || isDenied || isWithdrawn) ? "opacity-50" : ""}`}
      data-testid={`div-buyer-${buyer.id}`}
    >
      <div className="flex items-center gap-3 p-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
            {canSeeContact ? getInitials(buyer.buyerEmail ?? "") : "?"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-base font-medium text-foreground ${(isMissed || isDenied || isWithdrawn) ? "line-through" : ""}`} data-testid={`text-buyer-name-${buyer.id}`}>
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
            {isWithdrawn && (
              <Badge variant="secondary" className="text-xs" data-testid={`badge-withdrawn-${buyer.id}`}>
                WITHDRAWN
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
            {buyer.offerPrice !== null }
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

          {(isOwner || isSelf) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setShowHistory(!showHistory)}
              data-testid={`button-toggle-history-${buyer.id}`}
              title="View history"
            >
              <History className="w-4 h-4" />
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

      {/* History Panel */}
      {(isOwner || isSelf) && showHistory && (
        <div className="px-3 pb-3 border-t border-border pt-2" data-testid={`div-history-${buyer.id}`}>
          {historyLoading && (
            <p className="text-xs text-muted-foreground">Loading history…</p>
          )}
          {historyError && (
            <p className="text-xs text-destructive">Failed to load history</p>
          )}
          {!historyLoading && !historyError && history.length === 0 && (
            <p className="text-xs text-muted-foreground">No history yet.</p>
          )}
          {!historyLoading && !historyError && history.length > 0 && (
            <ul className="space-y-2">
              {history.map((h, idx) => (
                <li key={h.id || idx} className="text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="inline-flex items-center gap-1">
                      <span className="font-medium text-foreground">{h.priorStatus}</span>
                      <span>→</span>
                      <span className="font-medium text-foreground">{h.newStatus} ({(() => { try { return format(new Date(h.createdAt), "MMM d, h:mm a"); } catch { return h.createdAt; } })()})</span>
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                    {typeof h.offerPrice === 'number' && (
                      <span>Offer: ${ Number(h.offerPrice).toFixed(2) }</span>
                    )}
                    {h.pickupTime && (
                      <span>Pickup: {(() => { try { return format(new Date(h.pickupTime), "MMM d, h:mm a"); } catch { return h.pickupTime; } })()}</span>
                    )}
                    {typeof h.shareContact === 'boolean' && (
                      <span>{h.shareContact ? 'Contact shared' : 'Contact hidden'}</span>
                    )}
                    {typeof h.shareAddress === 'boolean' && h.shareAddress && (
                      <span>Address shared</span>
                    )}
                    {h.actorEmail && (
                      <span>By: {isSelf && h.actorEmail?.toLowerCase() === (buyer.buyerEmail || '').toLowerCase() ? 'you' : h.actorEmail}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
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
          {onMessageBuyer && buyer.buyerId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMessageBuyer(buyer.buyerId!)}
              data-testid={`button-message-buyer-${buyer.id}`}
              title="Message buyer"
              className="relative"
            >
              <MessageSquare className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Message button for non-pending buyers (approved, missed, etc.) */}
      {isOwner && !isPending && onMessageBuyer && buyer.buyerId && (
        <div className="px-3 pb-3 border-t border-border pt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full relative"
            onClick={() => onMessageBuyer(buyer.buyerId!)}
            data-testid={`button-message-buyer-${buyer.id}`}
            title="Message buyer"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Message
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Button>
        </div>
      )}

      {/* Buyer message button - buyers can message seller anytime */}
      {isSelf && onMessageOwner && ownerId && (
        <div className="px-3 pb-3 border-t border-border pt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onMessageOwner(ownerId)}
            data-testid={`button-message-owner-${buyer.id}`}
            title="Message seller"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Message Seller
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

      {/* Buyer view: approved but address not shared yet - allow request */}
      {isSelf && isApproved && !buyer.pickupAddress && (
        <div className="px-3 pb-3 border-t border-border pt-2 flex flex-col gap-2">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <HelpCircle className="w-4 h-4 mt-0.5" />
            <p>Pickup address not shared yet. You can request it from the owner.</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              try {
                await apiRequest("POST", `/api/buying-queue/${buyer.id}/request-address`);
              } catch (e:any) {
                // Silent fail for now; could integrate toast via prop callback.
              }
            }}
            data-testid={`button-request-address-${buyer.id}`}
          >
            Request Pickup Address
          </Button>
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
      {isSelf && !buyer.shareContact && buyer.status !== "MISSED" && !isWithdrawn && onShareContact && (
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

          <div className="mt-2 flex flex-col gap-2">
            {/* If address hasn't been shared yet, allow owner to share it post-approval (possibly after a request) */}
            {ownerAddress && !buyer.pickupAddress && onApprove && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onApprove(buyer.id, { shareAddress: true })}
                  data-testid={`button-share-address-${buyer.id}`}
                >
                  <MapPin className="w-4 h-4 mr-1" /> Share pickup address
                </Button>
                <p className="text-[10px] text-muted-foreground">Share your address only when ready for this buyer to arrive.</p>
              </>
            )}
            
            {/* Retract approval button */}
            {onRetract && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRetract(buyer.id)}
                data-testid={`button-retract-${buyer.id}`}
                className="text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4 mr-1" /> Retract Approval (Deny)
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

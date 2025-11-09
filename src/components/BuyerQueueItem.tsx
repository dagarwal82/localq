import { useState } from "react";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Clock, DollarSign, Phone, Mail, ChevronDown, ChevronUp, Check, X } from "lucide-react";
import type { BuyerInterest } from "../pages/Home";
import { format } from "date-fns";

interface BuyerQueueItemProps {
  buyer: BuyerInterest;
  isNext: boolean;
  isOwner?: boolean;
  onApprove?: (queueId: string) => void;
  onDeny?: (queueId: string) => void;
}

export function BuyerQueueItem({ buyer, isNext, isOwner = false, onApprove, onDeny }: BuyerQueueItemProps) {
  const [showContact, setShowContact] = useState(false);
  
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
  const bgClass = isApproved 
    ? "bg-green-50 dark:bg-green-950/10 border-green-200 dark:border-green-800" 
    : isNext 
    ? "bg-warning/10" 
    : "";
  const hasContact = !!buyer.buyerEmail;

  return (
    <div
      className={`rounded-md border border-border ${bgClass} ${isMissed ? "opacity-50" : ""}`}
      data-testid={`div-buyer-${buyer.id}`}
    >
      <div className="flex items-center gap-3 p-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
            {getInitials(buyer.buyerEmail ?? "")}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-base font-medium text-foreground ${isMissed ? "line-through" : ""}`} data-testid={`text-buyer-name-${buyer.id}`}>
              {buyer.buyerEmail}
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
            <span className={`text-base font-medium ${buyer.offerPrice === null ? "text-success" : "text-foreground"}`} data-testid={`text-offer-${buyer.id}`}>
              {formatPrice(buyer.offerPrice ?? null)}
            </span>
          </div>
          
          {hasContact && (
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

      {showContact && hasContact && (
        <div className="px-3 pb-3 space-y-2 border-t border-border pt-2" data-testid={`div-contact-${buyer.id}`}> 
          {buyer.buyerEmail && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              <a href={`mailto:${buyer.buyerEmail}`} className="hover:text-foreground" data-testid={`link-email-${buyer.id}`}>
                {buyer.buyerEmail}
              </a>
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
            onClick={() => onApprove(buyer.id)}
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

      {/* Owner View - Approved buyer waiting for pickup */}
      {isOwner && isApproved && (
        <div className="px-3 pb-3 border-t border-border pt-2">
          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
            <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              Waiting for pickup
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

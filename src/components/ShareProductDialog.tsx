import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareProductDialogProps {
  listingId: string;
  listingKey: string;
  listingName: string;
}

export function ShareProductDialog({ listingId, listingKey, listingName }: ShareProductDialogProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const publicBase = (import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, "");
  const listingUrl = `${publicBase}/listing/${listingId}?k=${listingKey}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(listingUrl);
      setCopied(true);
      toast({
        title: "Link Copied!",
        description: "The listing link has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to Copy",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full" data-testid={`button-share-${listingId}`}>
          <Share2 className="w-4 h-4 mr-2" />
          Share QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid={`dialog-share-${listingId}`}>
        <DialogHeader>
          <DialogTitle>Share "{listingName}"</DialogTitle>
          <DialogDescription>
            Buyers can scan this QR code to access your listing
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-white p-4 rounded-md" data-testid={`qr-code-${listingId}`}>
            <QRCodeSVG value={listingUrl} size={200} includeMargin={true} />
          </div>
          <div className="w-full space-y-2">
            <label className="text-sm font-medium text-foreground">Or copy the link</label>
            <div className="flex gap-2">
              <Input 
                value={listingUrl} 
                readOnly 
                className="flex-1"
                data-testid={`input-share-url-${listingId}`}
              />
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleCopyLink}
                data-testid={`button-copy-link-${listingId}`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

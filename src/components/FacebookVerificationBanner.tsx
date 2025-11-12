import { useState, useEffect } from "react";
import { X, BadgeCheck } from "lucide-react";
import { FaFacebook } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FacebookVerificationBannerProps {
  onAddProfile: () => void;
  className?: string;
}

const DISMISS_KEY = "facebook_verification_banner_dismissed";
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export function FacebookVerificationBanner({
  onAddProfile,
  className = "",
}: FacebookVerificationBannerProps) {
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    // Check if banner was dismissed recently
    const dismissedData = localStorage.getItem(DISMISS_KEY);
    if (dismissedData) {
      const { timestamp } = JSON.parse(dismissedData);
      const now = Date.now();
      if (now - timestamp < DISMISS_DURATION) {
        setIsDismissed(true);
        return;
      }
    }
    setIsDismissed(false);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(
      DISMISS_KEY,
      JSON.stringify({ timestamp: Date.now() })
    );
    setIsDismissed(true);
  };

  if (isDismissed) return null;

  return (
    <Alert className={`border-[#1877F2]/20 bg-[#1877F2]/5 ${className}`}>
      <div className="flex items-start gap-3">
        <FaFacebook className="text-[#1877F2] mt-0.5" size={20} />
        <div className="flex-1 space-y-2">
          <AlertDescription className="text-sm">
            <div className="flex items-center gap-2 mb-1">
              <BadgeCheck className="w-4 h-4 text-[#1877F2]" />
              <strong>Get verified with Facebook (2 simple steps)</strong>
            </div>
            <p className="text-sm text-muted-foreground">
              Link your Facebook account and add your public profile URL to earn a verified badge and build trust with buyers and sellers. Verified users are more likely to get responses!
            </p>
          </AlertDescription>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={onAddProfile}
              className="bg-[#1877F2] hover:bg-[#1877F2]/90 h-8"
            >
              Get Verified
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="h-8 text-muted-foreground"
            >
              Remind me later
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="h-6 w-6 -mr-2 -mt-1"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}

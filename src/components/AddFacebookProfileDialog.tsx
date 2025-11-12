import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FaFacebook } from "react-icons/fa";
import { BadgeCheck, Info, AlertTriangle, CheckCircle2 } from "lucide-react";

interface AddFacebookProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canSkip?: boolean; // Allow skipping during onboarding
  onSkip?: () => void;
}

export function AddFacebookProfileDialog({
  open,
  onOpenChange,
  canSkip = false,
  onSkip,
}: AddFacebookProfileDialogProps) {
  const { toast } = useToast();
  const [profileUrl, setProfileUrl] = useState("");
  const [error, setError] = useState("");

  // Check if user has Facebook linked
  const { data: user, refetch: refetchUser } = useQuery({
    queryKey: ["/api/auth/me"],
    enabled: open,
  });

  const hasFacebookLinked = !!user?.facebookId;
  const hasProfileUrl = !!user?.fbProfileUrl;

  const handleLinkFacebook = () => {
    const apiRoot = (import.meta.env.VITE_API_URL || 'https://api.spacevox.com').replace(/\/$/, '');
    // Store flag to return to dialog after OAuth
    sessionStorage.setItem('returnToFacebookVerification', 'true');
    window.location.href = `${apiRoot}/oauth2/authorization/facebook`;
  };

  const validateFacebookUrl = (url: string): boolean => {
    if (!url.trim()) return false;
    
    // Accept various Facebook URL formats
    const patterns = [
      /^https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9.]+\/?$/, // https://facebook.com/username
      /^https?:\/\/(www\.)?facebook\.com\/profile\.php\?id=\d+$/, // https://facebook.com/profile.php?id=123456
      /^https?:\/\/(www\.)?fb\.com\/[a-zA-Z0-9.]+\/?$/, // Short URL with username
      /^facebook\.com\/[a-zA-Z0-9.]+\/?$/, // Without protocol, username
      /^facebook\.com\/profile\.php\?id=\d+$/, // Without protocol, profile ID
      /^fb\.com\/[a-zA-Z0-9.]+\/?$/, // Short URL without protocol
      /^[a-zA-Z0-9.]+$/, // Just username
    ];

    return patterns.some(pattern => pattern.test(url.trim()));
  };

  const normalizeFacebookUrl = (url: string): string => {
    const trimmed = url.trim();
    
    // If it's already a full profile.php URL, just normalize the domain
    if (/profile\.php\?id=\d+/.test(trimmed)) {
      if (!/^https?:\/\//.test(trimmed)) {
        const cleanUrl = trimmed.replace(/^(facebook\.com\/|fb\.com\/)/, '');
        return `https://facebook.com/${cleanUrl}`;
      }
      return trimmed.replace('fb.com', 'facebook.com');
    }
    
    // If it's just a username, add the full URL
    if (!/^https?:\/\//.test(trimmed)) {
      const username = trimmed.replace(/^(facebook\.com\/|fb\.com\/)/, '');
      return `https://facebook.com/${username}`;
    }
    
    // Normalize fb.com to facebook.com
    return trimmed.replace('fb.com', 'facebook.com');
  };

  const saveMutation = useMutation({
    mutationFn: async (url: string) => {
      return apiRequest("POST", "/api/auth/facebook-profile", { profileUrl: url });
    },
    onSuccess: () => {
      toast({
        title: "Profile added!",
        description: "Your Facebook profile has been linked successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setProfileUrl("");
      setError("");
      onOpenChange(false);
    },
    onError: (error: any) => {
      setError(error.message || "Failed to save Facebook profile");
    },
  });

  const handleSave = () => {
    if (!validateFacebookUrl(profileUrl)) {
      setError("Please enter a valid Facebook profile URL or username");
      return;
    }

    const normalizedUrl = normalizeFacebookUrl(profileUrl);
    saveMutation.mutate(normalizedUrl);
  };

  const handleSkip = () => {
    setProfileUrl("");
    setError("");
    onOpenChange(false);
    if (onSkip) onSkip();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FaFacebook className="text-[#1877F2]" size={24} />
            Get Facebook Verified
          </DialogTitle>
          <DialogDescription>
            Complete both steps to earn a verified badge and build trust with other users.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Step 1: Link Facebook Account */}
          <div className={`border rounded-lg p-4 ${hasFacebookLinked ? 'bg-green-50 dark:bg-green-950/10 border-green-200 dark:border-green-800' : 'bg-muted/30'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#1877F2] text-white text-xs font-bold">
                    1
                  </span>
                  <h3 className="font-medium">Link Your Facebook Account</h3>
                  {hasFacebookLinked && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                </div>
                <p className="text-sm text-muted-foreground ml-8">
                  {hasFacebookLinked 
                    ? "Your Facebook account is connected. This verifies your ownership."
                    : "Connect with Facebook to verify account ownership."
                  }
                </p>
              </div>
              {!hasFacebookLinked && (
                <Button
                  size="sm"
                  onClick={handleLinkFacebook}
                  className="bg-[#1877F2] hover:bg-[#1877F2]/90 flex-shrink-0"
                >
                  <FaFacebook className="mr-2" size={16} />
                  Link Facebook
                </Button>
              )}
            </div>
          </div>

          {/* Step 2: Add Public Profile URL */}
          <div className={`border rounded-lg p-4 ${!hasFacebookLinked ? 'opacity-60' : hasProfileUrl ? 'bg-green-50 dark:bg-green-950/10 border-green-200 dark:border-green-800' : 'bg-muted/30'}`}>
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#1877F2] text-white text-xs font-bold">
                    2
                  </span>
                  <h3 className="font-medium">Add Your Public Profile URL</h3>
                  {hasProfileUrl && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                </div>
                <p className="text-sm text-muted-foreground ml-8">
                  {!hasFacebookLinked 
                    ? "Link your Facebook account first to enable this step."
                    : hasProfileUrl
                    ? "Your public profile URL is saved and visible to others."
                    : "Add your public Facebook profile URL so others can verify you."
                  }
                </p>
              </div>
            </div>

            {hasFacebookLinked && !hasProfileUrl && (
              <>
                <div className="space-y-2 ml-8">
                  <Label htmlFor="facebook-url">Facebook Profile URL</Label>
                  <Input
                    id="facebook-url"
                    placeholder="https://facebook.com/yourname or profile.php?id=123456"
                    value={profileUrl}
                    onChange={(e) => {
                      setProfileUrl(e.target.value);
                      setError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSave();
                      }
                    }}
                    disabled={!hasFacebookLinked}
                  />
                  <p className="text-xs text-muted-foreground flex items-start gap-1">
                    <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>
                      Your public profile URL (e.g., facebook.com/<strong>yourname</strong> or facebook.com/profile.php?id=<strong>123456</strong>)
                    </span>
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive" className="ml-8 mt-3">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="bg-muted/50 p-3 rounded-lg ml-8 mt-3">
                  <p className="text-xs font-medium mb-2">How to find your URL:</p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Open Facebook and go to your profile</li>
                    <li>Copy the URL from your browser (looks like facebook.com/yourname)</li>
                    <li>Paste it here</li>
                  </ol>
                </div>
              </>
            )}
          </div>

          {/* Verification Status */}
          {hasFacebookLinked && hasProfileUrl && (
            <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/10">
              <BadgeCheck className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900 dark:text-green-100">
                <strong>You're verified!</strong> You now have a verified badge on your profile. Other users will see a blue checkmark next to your name.
              </AlertDescription>
            </Alert>
          )}

          {!hasFacebookLinked && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Why both steps?</strong> Linking your Facebook account verifies ownership, while the public URL lets others view your profile to build trust.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {canSkip && !(hasFacebookLinked && hasProfileUrl) && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              {hasFacebookLinked ? "Skip for now" : "Skip verification"}
            </Button>
          )}
          {hasFacebookLinked && !hasProfileUrl && (
            <Button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending || !profileUrl.trim()}
              className="bg-[#1877F2] hover:bg-[#1877F2]/90"
            >
              {saveMutation.isPending ? "Saving..." : "Save & Complete"}
            </Button>
          )}
          {hasFacebookLinked && hasProfileUrl && (
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                if (onSkip) onSkip();
              }}
              className="bg-green-600 hover:bg-green-600/90"
            >
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

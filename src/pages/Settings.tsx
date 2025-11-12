import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '../lib/queryClient';
import { useLocation, Link } from 'wouter';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { useToast } from '../hooks/use-toast';
import { ArrowLeft, CheckCircle2, Link2, Unlink, RefreshCw, Info, BadgeCheck } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebook } from 'react-icons/fa';
import { AddFacebookProfileDialog } from '../components/AddFacebookProfileDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';

interface UserProfile {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  facebookVerified: string | null;
  fbProfileUrl: string | null;
  emailVerified: boolean;
}

export default function Settings() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showFacebookProfileDialog, setShowFacebookProfileDialog] = useState(false);

  // Fetch current user profile
  const { data: user, isLoading } = useQuery<UserProfile>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      try {
        return await apiRequest('GET', '/api/auth/me');
      } catch (error) {
        setLocation('/');
        return null;
      }
    },
  });

  // Check if returning from Facebook OAuth
  useEffect(() => {
    const shouldReturn = sessionStorage.getItem('returnToFacebookVerification');
    if (shouldReturn === 'true') {
      sessionStorage.removeItem('returnToFacebookVerification');
      // Small delay to ensure user data is refreshed
      setTimeout(() => {
        setShowFacebookProfileDialog(true);
      }, 500);
    }
  }, []);

  // Unlink Google mutation
  const unlinkGoogleMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/auth/unlink/google', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: 'Google Unlinked',
        description: 'Your Google account has been unlinked successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.message || 'Failed to unlink Google account',
      });
    },
  });

  // Unlink Facebook mutation
  const unlinkFacebookMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/auth/unlink/facebook', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: 'Facebook Unlinked',
        description: 'Your Facebook account has been unlinked successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.message || 'Failed to unlink Facebook account',
      });
    },
  });

  const handleLinkGoogle = () => {
    const apiRoot = (import.meta.env.VITE_API_URL || 'https://api.spacevox.com').replace(/\/$/, '');
    // Store current page for post-link redirect
    sessionStorage.setItem('postAuthRedirect', '/settings');
    window.location.href = `${apiRoot}/oauth2/authorization/google`;
  };

  const handleLinkFacebook = () => {
    const apiRoot = (import.meta.env.VITE_API_URL || 'https://api.spacevox.com').replace(/\/$/, '');
    // Store current page for post-link redirect
    sessionStorage.setItem('postAuthRedirect', '/settings');
    window.location.href = `${apiRoot}/oauth2/authorization/facebook`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const hasFacebookLinked = !!user.facebookVerified;
  const hasPassword = !!user.email; // Assuming password users have email

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto max-w-4xl px-4 py-3 flex items-center gap-4">
          <Link href="/home">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Account Settings</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Account Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your basic account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Email</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-base">{user.email || 'No email'}</span>
                {user.emailVerified && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
            {(user.firstName || user.lastName) && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Name</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-base">
                    {[user.firstName, user.lastName].filter(Boolean).join(' ')}
                  </span>
                 
                </div>
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-muted-foreground">Role</div>
              <div className="mt-1">
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                  {user.role}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Facebook Verification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-[#1877F2]" />
              Facebook Verification
            </CardTitle>
            <CardDescription>
              Complete both steps to get verified: link your Facebook account and add your public profile URL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasFacebookLinked && user.fbProfileUrl ? (
              <div className="flex items-start gap-3 p-4 border rounded-lg bg-green-50 dark:bg-green-950/10 border-green-200 dark:border-green-800">
                <BadgeCheck className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div>
                    <h4 className="font-medium text-sm text-green-900 dark:text-green-100 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      You're fully verified!
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Your Facebook account is linked and your public profile is visible to others. You have a verified badge!
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Account Linked
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Profile URL Added
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={user.fbProfileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#1877F2] hover:underline flex items-center gap-1"
                    >
                      <FaFacebook size={16} />
                      View Profile
                    </a>
                    <span className="text-muted-foreground">•</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFacebookProfileDialog(true)}
                      className="h-auto p-0 text-sm hover:bg-transparent hover:underline"
                    >
                      Update
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 border rounded-lg bg-[#1877F2]/5 border-[#1877F2]/20">
                  <Info className="text-[#1877F2] mt-0.5" size={20} />
                  <div className="flex-1 space-y-2">
                    <div>
                      <h4 className="font-medium text-sm">Get verified with Facebook</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Get a verified badge to build trust with buyers and sellers. Complete both steps below:
                      </p>
                    </div>
                    <div className="space-y-2 pl-4 border-l-2 border-[#1877F2]/20">
                      <div className="flex items-center gap-2">
                        {hasFacebookLinked ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                        )}
                        <span className="text-sm">
                          {hasFacebookLinked ? "Facebook account linked ✓" : "Link your Facebook account"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.fbProfileUrl ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                        )}
                        <span className="text-sm">
                          {user.fbProfileUrl ? "Public profile URL added ✓" : "Add your public profile URL"}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowFacebookProfileDialog(true)}
                      className="bg-[#1877F2] hover:bg-[#1877F2]/90"
                    >
                      <BadgeCheck className="w-4 h-4 mr-2" />
                      {hasFacebookLinked && !user.fbProfileUrl ? "Add Profile URL" : "Start Verification"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Data & Privacy */}
        <Card>
          <CardHeader>
            <CardTitle>Data & Privacy</CardTitle>
            <CardDescription>
              Manage your data and privacy settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30">
              <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 space-y-2">
                <div>
                  <h4 className="font-medium text-sm">Account & Data Deletion</h4>
                  <p className="text-sm text-muted-foreground">
                    Learn how to permanently delete your account and all associated data from LocalQ.
                  </p>
                </div>
                <Link href="/data-deletion">
                  <Button variant="outline" size="sm">
                    View Deletion Instructions
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Back to Home Button */}
        <div className="flex justify-center">
          <Link href="/home">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </main>

      {/* Facebook Profile Dialog */}
      <AddFacebookProfileDialog 
        open={showFacebookProfileDialog} 
        onOpenChange={setShowFacebookProfileDialog}
        canSkip={false}
      />
    </div>
  );
}

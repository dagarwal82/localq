import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '../lib/queryClient';
import { useLocation, Link } from 'wouter';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { useToast } from '../hooks/use-toast';
import { ArrowLeft, CheckCircle2, Link2, Unlink, RefreshCw, Info } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebook } from 'react-icons/fa';
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
  emailVerified: boolean;
}

export default function Settings() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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
                <div className="text-base mt-1">
                  {[user.firstName, user.lastName].filter(Boolean).join(' ')}
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

        {/* Connected Accounts Card */}
        <Card>
          <CardHeader>
            <CardTitle>Connected Accounts</CardTitle>
            <CardDescription>
              Link your social accounts to sign in quickly and get verified badges
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Facebook Account */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <FaFacebook size={24} className="text-[#1877F2]" />
                <div>
                  <div className="font-medium">Facebook</div>
                  <div className="text-sm text-muted-foreground">
                    {hasFacebookLinked ? 'Connected' : 'Not connected'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasFacebookLinked && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </Badge>
                )}
                {hasFacebookLinked ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={unlinkFacebookMutation.isPending || (!hasPassword)}
                      >
                        <Unlink className="w-4 h-4 mr-2" />
                        Unlink
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Unlink Facebook Account?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to unlink your Facebook account? You'll no longer be able to sign in with Facebook.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => unlinkFacebookMutation.mutate()}
                        >
                          Unlink
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLinkFacebook}
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Link Account
                  </Button>
                )}
              </div>
            </div>

            {(!hasPassword) || (!hasPassword && !hasFacebookLinked) ? (
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                ⚠️ You must have at least one sign-in method (password or linked account). Keep at least one option connected.
              </div>
            ) : null}
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
    </div>
  );
}

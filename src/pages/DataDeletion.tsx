import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Shield, AlertTriangle } from "lucide-react";

export default function DataDeletion() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto space-y-6 py-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Data Deletion Instructions</h1>
          <p className="text-muted-foreground">
            Learn how to delete your data from SpaceVox
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Your Privacy Matters
            </CardTitle>
            <CardDescription>
              We respect your right to control your personal data. Follow the instructions below to delete your account and associated data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Deleting your account is permanent and cannot be undone. All your data including products, listings, and buyer interests will be permanently removed.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  How to Delete Your Account
                </h3>
                <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
                  <li className="pl-2">
                    <strong className="text-foreground">Log in to your account</strong> - Visit SpaceVox and sign in using your credentials.
                  </li>
                  <li className="pl-2">
                    <strong className="text-foreground">Go to Settings</strong> - Click on your profile menu and select "Settings".
                  </li>
                  <li className="pl-2">
                    <strong className="text-foreground">Navigate to Account section</strong> - Scroll to the bottom of the Settings page.
                  </li>
                  <li className="pl-2">
                    <strong className="text-foreground">Click "Delete Account"</strong> - A confirmation dialog will appear.
                  </li>
                  <li className="pl-2">
                    <strong className="text-foreground">Confirm deletion</strong> - Read the warning and confirm your decision.
                  </li>
                </ol>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-2">What Gets Deleted?</h3>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                  <li className="pl-2">Your account profile and authentication data</li>
                  <li className="pl-2">All products you've created</li>
                  <li className="pl-2">All listings you own</li>
                  <li className="pl-2">Your buyer interests and queue positions</li>
                  <li className="pl-2">Product images and uploaded files</li>
                  <li className="pl-2">Any linked social media accounts (Google, Facebook)</li>
                </ul>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-2">Data Retention</h3>
                <p className="text-sm text-muted-foreground">
                  Some data may be retained for legal or operational purposes:
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground mt-2">
                  <li className="pl-2">Transaction logs for up to 90 days for fraud prevention</li>
                  <li className="pl-2">Backup data for up to 30 days before permanent deletion</li>
                  <li className="pl-2">Anonymized analytics data (cannot be linked back to you)</li>
                </ul>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-2">Need Help?</h3>
                <p className="text-sm text-muted-foreground">
                  If you're unable to delete your account or have questions about data deletion, please contact us at{" "}
                  <a href="mailto:team@spacevox.com" className="text-primary hover:underline">
                    team@spacevox.com
                  </a>
                </p>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-2">Facebook Users</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  If you signed up using Facebook, deleting your SpaceVox account will also remove all data shared with us through Facebook Login. Your Facebook account itself will not be affected.
                </p>
                <p className="text-sm text-muted-foreground">
                  You can also revoke SpaceVox's access to your Facebook data by visiting your{" "}
                  <a 
                    href="https://www.facebook.com/settings?tab=applications" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Facebook Apps and Websites settings
                  </a>.
                </p>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <Button asChild variant="default">
                <a href="/settings">Go to Settings</a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              For more information about how we handle your data, please read our{" "}
              <a href="/legal/privacy" className="text-primary hover:underline">
                Privacy Policy
              </a>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

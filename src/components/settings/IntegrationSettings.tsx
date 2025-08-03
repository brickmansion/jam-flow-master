import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';
import { ExternalLink, Link, CheckCircle } from 'lucide-react';

interface IntegrationSettingsProps {
  profile: UserProfile | null;
}

export function IntegrationSettings({ profile }: IntegrationSettingsProps) {
  const { toast } = useToast();

  const handleSlackConnect = () => {
    toast({
      title: "Coming soon",
      description: "Slack OAuth integration will be available in a future update",
    });
  };

  const handleGoogleDriveConnect = () => {
    toast({
      title: "Coming soon", 
      description: "Google Drive integration will be available in a future update",
    });
  };

  const isSlackConnected = profile?.prefs?.slackWebhook;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Link className="h-5 w-5" />
          Third-party Integrations
        </h3>
        <p className="text-sm text-muted-foreground">
          Connect external services to enhance your workflow
        </p>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#4A154B] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">S</span>
                </div>
                <div>
                  <CardTitle className="text-base">Slack</CardTitle>
                  <CardDescription>
                    Get notifications and updates in your Slack workspace
                  </CardDescription>
                </div>
              </div>
              {isSlackConnected && (
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {isSlackConnected 
                  ? 'Notifications will be sent to your configured Slack webhook'
                  : 'Connect to receive project notifications in Slack'
                }
              </div>
              <Button 
                variant={isSlackConnected ? "outline" : "default"} 
                onClick={handleSlackConnect}
                className="ml-4"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {isSlackConnected ? 'Reconfigure' : 'Connect Slack'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#4285F4] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">G</span>
                </div>
                <div>
                  <CardTitle className="text-base">Google Drive</CardTitle>
                  <CardDescription>
                    Sync project files and share documents easily
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Connect to automatically sync project files with Google Drive
              </div>
              <Button variant="outline" onClick={handleGoogleDriveConnect} className="ml-4">
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect Drive
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg bg-muted/50 p-4">
        <h4 className="font-medium mb-2">Integration Notes</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• OAuth tokens are securely stored in your user preferences</li>
          <li>• You can disconnect integrations at any time</li>
          <li>• More integrations (Dropbox, OneDrive) coming soon</li>
        </ul>
      </div>
    </div>
  );
}
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useUserProfile, UserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';
import { Save, Mail, Bell } from 'lucide-react';

const notificationSettingsSchema = z.object({
  invite: z.boolean(),
  taskReady: z.boolean(),
  commentMention: z.boolean(),
  slackWebhook: z.string()
    .optional()
    .refine(
      (val) => !val || val.startsWith('https://hooks.slack.com'),
      'Slack webhook must start with https://hooks.slack.com'
    ),
});

type NotificationSettingsForm = z.infer<typeof notificationSettingsSchema>;

interface NotificationSettingsProps {
  profile: UserProfile | null;
}

export function NotificationSettings({ profile }: NotificationSettingsProps) {
  const { updatePreferences } = useUserProfile();
  const { toast } = useToast();

  const form = useForm<NotificationSettingsForm>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      invite: profile?.prefs?.notifications?.invite ?? true,
      taskReady: profile?.prefs?.notifications?.taskReady ?? true,
      commentMention: profile?.prefs?.notifications?.commentMention ?? true,
      slackWebhook: profile?.prefs?.slackWebhook || '',
    },
  });

  const onSubmit = async (data: NotificationSettingsForm) => {
    try {
      await updatePreferences({
        notifications: {
          invite: data.invite,
          taskReady: data.taskReady,
          commentMention: data.commentMention,
        },
        slackWebhook: data.slackWebhook,
      });

      toast({
        title: "Notifications updated",
        description: "Your notification settings have been successfully updated",
      });
    } catch (error) {
      console.error('Error updating notifications:', error);
      toast({
        title: "Update failed",
        description: "Failed to update notification settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Notifications
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose which email notifications you'd like to receive
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="invite"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Project Invitations</FormLabel>
                    <FormDescription>
                      Get notified when you're invited to a project
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="taskReady"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Task Updates</FormLabel>
                    <FormDescription>
                      Get notified when tasks are assigned or completed
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="commentMention"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Mentions</FormLabel>
                    <FormDescription>
                      Get notified when someone mentions you in comments
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4 pt-6 border-t">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Slack Integration
            </h3>
            
            <FormField
              control={form.control}
              name="slackWebhook"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slack Webhook URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://hooks.slack.com/services/..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional: Add your Slack webhook URL to receive notifications in your Slack workspace
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
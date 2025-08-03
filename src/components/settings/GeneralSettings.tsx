import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useUserProfile, UserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { Keyboard, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const generalSettingsSchema = z.object({
  theme: z.enum(['system', 'dark', 'light']),
  dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY']),
});

type GeneralSettingsForm = z.infer<typeof generalSettingsSchema>;

interface GeneralSettingsProps {
  profile: UserProfile | null;
}

export function GeneralSettings({ profile }: GeneralSettingsProps) {
  const { updatePreferences } = useUserProfile();
  const { toast } = useToast();
  const { setTheme } = useTheme();

  const form = useForm<GeneralSettingsForm>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      theme: profile?.prefs?.theme || 'system',
      dateFormat: profile?.prefs?.dateFormat || 'MM/DD/YYYY',
    },
  });

  const onSubmit = async (data: GeneralSettingsForm) => {
    try {
      await updatePreferences({
        theme: data.theme,
        dateFormat: data.dateFormat,
      });

      // Apply theme immediately
      setTheme(data.theme);

      // Store in localStorage as fallback
      localStorage.setItem('seshprep-theme', data.theme);
      localStorage.setItem('seshprep-dateFormat', data.dateFormat);

      toast({
        title: "Settings updated",
        description: "Your general settings have been successfully updated",
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Update failed",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="theme"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Theme</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="system" id="system" />
                      <Label htmlFor="system">System</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="light" id="light" />
                      <Label htmlFor="light">Light</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="dark" id="dark" />
                      <Label htmlFor="dark">Dark</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dateFormat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date Format</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="MM/DD/YYYY" id="mdy" />
                      <Label htmlFor="mdy">MM/DD/YYYY</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="DD/MM/YYYY" id="dmy" />
                      <Label htmlFor="dmy">DD/MM/YYYY</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between pt-4 border-t">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" type="button">
                  <Keyboard className="h-4 w-4 mr-2" />
                  Keyboard Shortcuts
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Keyboard Shortcuts</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Navigation</h4>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Dashboard</span>
                          <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl + D</kbd>
                        </div>
                        <div className="flex justify-between">
                          <span>Command Palette</span>
                          <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl + K</kbd>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Tasks</h4>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>New Task</span>
                          <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl + N</kbd>
                        </div>
                        <div className="flex justify-between">
                          <span>Search Tasks</span>
                          <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl + F</kbd>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

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
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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
import { Save } from 'lucide-react';

const editProfileSchema = z.object({
  display_name: z.string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name must be less than 50 characters'),
  bio: z.string()
    .max(280, 'Bio must be less than 280 characters')
    .optional(),
});

type EditProfileForm = z.infer<typeof editProfileSchema>;

interface EditProfileFormProps {
  profile: UserProfile | null;
  onSave: () => void;
}

export function EditProfileForm({ profile, onSave }: EditProfileFormProps) {
  const { updateProfile } = useUserProfile();
  const { toast } = useToast();

  const form = useForm<EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      display_name: profile?.display_name || '',
      bio: profile?.bio || '',
    },
  });

  const onSubmit = async (data: EditProfileForm) => {
    try {
      await updateProfile({
        display_name: data.display_name,
        bio: data.bio || null,
      });

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      });

      onSave();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="display_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your display name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tell us a bit about yourself..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <div className="text-xs text-muted-foreground">
                  {field.value?.length || 0}/280 characters
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-3 pt-4">
            <Button 
              type="submit" 
              className="flex-1"
              disabled={form.formState.isSubmitting}
            >
              <Save className="h-4 w-4 mr-2" />
              {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
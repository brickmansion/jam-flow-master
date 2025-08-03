import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Save } from 'lucide-react';

const editProfileSchema = z.object({
  display_name: z.string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name must be less than 50 characters'),
  bio: z.string()
    .max(280, 'Bio must be less than 280 characters')
    .optional(),
  role: z.enum(['producer', 'assistant', 'artist']),
});

type EditProfileForm = z.infer<typeof editProfileSchema>;

interface EditProfileFormProps {
  profile: UserProfile | null;
  onSave: () => void;
}

export function EditProfileForm({ profile, onSave }: EditProfileFormProps) {
  const { updateProfile } = useUserProfile();
  const { profile: authProfile } = useAuth();
  const { toast } = useToast();

  const form = useForm<EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      display_name: profile?.display_name || '',
      bio: profile?.bio || '',
      role: (authProfile?.role || 'producer') as 'producer' | 'assistant' | 'artist',
    },
  });

  const onSubmit = async (data: EditProfileForm) => {
    try {
      // Update profile data
      await updateProfile({
        display_name: data.display_name,
        bio: data.bio || null,
      });

      // Update user role in auth metadata if it changed
      if (data.role !== authProfile?.role) {
        const { error: roleError } = await supabase.auth.updateUser({
          data: { role: data.role }
        });
        
        if (roleError) {
          throw roleError;
        }
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      });

      onSave();
      
      // Refresh the page to update the auth profile context
      if (data.role !== authProfile?.role) {
        window.location.reload();
      }
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

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="producer">Producer</SelectItem>
                    <SelectItem value="assistant">Assistant</SelectItem>
                    <SelectItem value="artist">Artist</SelectItem>
                  </SelectContent>
                </Select>
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
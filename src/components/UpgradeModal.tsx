import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/hooks/useWorkspace';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { workspace, isTrialActive, isTrialExpired, trialDaysLeft } = useWorkspace();

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('create-checkout-session');

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: "Error",
        description: "Failed to start checkout process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getModalTitle = () => {
    if (isTrialActive) {
      return `You're in a 10-day Pro trial (${trialDaysLeft} days left)`;
    }
    if (isTrialExpired) {
      return "Your trial has ended";
    }
    return "Upgrade to SeshPrep Pro";
  };

  const getModalDescription = () => {
    if (isTrialActive) {
      return "Upgrade now to keep access to all Pro features when your trial ends.";
    }
    if (isTrialExpired) {
      return "Upgrade to continue using Pro features.";
    }
    return "Unlock powerful features for professional music production.";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {getModalTitle()}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {getModalDescription()}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-semibold mb-3">Pro Features:</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">Upload full sessions (ZIP/PTX ≤ 60 GB)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">100 GB included storage</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">Unlimited active projects</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">Priority support</span>
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold">$19<span className="text-sm font-normal">/month</span></div>
            <p className="text-xs text-muted-foreground">Cancel anytime</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpgrade}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Proceed to Checkout"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
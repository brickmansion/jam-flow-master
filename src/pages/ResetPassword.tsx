import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  // On component mount, we check for a recovery code in the URL.
  // If present, we exchange it for a session, which is required to update the user's password.
  useEffect(() => {
    const exchangeCodeForSession = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');

      // If no code is present, the link is invalid.
      if (!code) {
        console.warn('ResetPassword DEBUG: No code found in URL.');
        setIsValidToken(false);
        return;
      }

      try {
        // Exchange the code for a session. Supabase handles the rest.
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) {
          console.error('ResetPassword DEBUG: exchangeCodeForSession failed', error);
          setIsValidToken(false);
          return;
        }

        // Session successfully established.
        console.log('ResetPassword DEBUG: Session successfully established from code.');
        setIsValidToken(true);

      } catch (e) {
        console.error('ResetPassword DEBUG: An unexpected error occurred during code exchange.', e);
        setIsValidToken(false);
      }
    };

    void exchangeCodeForSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      // The session should already be established from the useEffect hook.
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        // The most likely error here is that the session is missing or expired.
        // We'll show a generic error message and let the user try again.
        console.error('ResetPassword DEBUG: updateUser failed', error);
        setError('Your session has expired. Please request a new password reset link.');
        setIsLoading(false);
        return;
      }

      toast({
        title: "Password updated",
        description: "Please log in with your new password"
      });

      navigate('/auth?reset=success');
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  // Render a loading state or nothing while we validate the token.
  if (isValidToken === null) {
    return null;
  }

  // If the token is invalid, show an error message.
  if (isValidToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invalid or expired link</CardTitle>
            <CardDescription>This password reset link is no longer valid</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Back to login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Otherwise, show the password reset form.
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>Enter your new password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !password || !confirmPassword}
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
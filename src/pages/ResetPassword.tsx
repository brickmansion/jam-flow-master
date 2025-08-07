import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  // Validate token on mount and ensure session is established
  useEffect(() => {
    const init = async () => {
      // Parse both hash fragment and query params (covers both token and code flows)
      const url = new URL(window.location.href);
      const hash = url.hash.substring(1); // Remove the #
      const hashParams = new URLSearchParams(hash);
      const type = hashParams.get('type') || url.searchParams.get('type');

      console.log('ResetPassword DEBUG: Full URL:', window.location.href);
      console.log('ResetPassword DEBUG: Hash fragment:', hash);
      console.log('ResetPassword DEBUG: Type param:', type);

      if (type !== 'recovery') {
        console.log('ResetPassword DEBUG: Not a recovery link');
        setIsValidToken(false);
        return;
      }

      // 1) Newer PKCE flow: ?code=... in the URL (no tokens in hash)
      const code = url.searchParams.get('code');
      if (code) {
        console.log('ResetPassword DEBUG: Found code param, exchanging for session');
        try {
          await supabase.auth.exchangeCodeForSession(window.location.href);
        } catch (e) {
          console.error('ResetPassword DEBUG: exchangeCodeForSession failed', e);
        }
      }

      // 2) Legacy flow: access_token and refresh_token present in hash
      const access_token = hashParams.get('access_token');
      const refresh_token = hashParams.get('refresh_token');
      if (access_token && refresh_token) {
        console.log('ResetPassword DEBUG: Found tokens in hash, setting session');
        try {
          await supabase.auth.setSession({ access_token, refresh_token });
        } catch (e) {
          console.error('ResetPassword DEBUG: setSession failed', e);
        }
      }

      // Verify session exists now
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('ResetPassword DEBUG: No session after processing link');
        setIsValidToken(false);
        return;
      }

      console.log('ResetPassword DEBUG: Recovery link detected and session present, showing form');
      setIsValidToken(true);
    };

    void init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validate password requirements
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    // Validate password match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

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

  // Render nothing while exchanging token
  if (isValidToken === null) {
    return null;
  }

  // Show invalid token state
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

  // Show password reset form
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
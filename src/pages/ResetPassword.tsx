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

  // Validate token on mount
  useEffect(() => {
    // Parse hash fragment instead of search params
    const hash = window.location.hash.substring(1); // Remove the #
    const hashParams = new URLSearchParams(hash);
    
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');
    
    console.log('ResetPassword DEBUG: Full URL:', window.location.href);
    console.log('ResetPassword DEBUG: Hash fragment:', hash);
    console.log('ResetPassword DEBUG: Parsed hash params:', Object.fromEntries(hashParams.entries()));
    console.log('ResetPassword DEBUG: Specific params:', { 
      accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : null, 
      refreshToken: refreshToken ? `${refreshToken.substring(0, 20)}...` : null, 
      type 
    });
    
    if (!accessToken || type !== 'recovery') {
      console.log('ResetPassword DEBUG: Missing required params');
      setIsValidToken(false);
      return;
    }

    // Set session for password reset
    console.log('ResetPassword DEBUG: Setting session...');
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || ''
    }).then(({ error }) => {
      console.log('ResetPassword DEBUG: Session result:', { error });
      setIsValidToken(!error);
      if (error) {
        console.error('ResetPassword DEBUG: Session error:', error);
        setError('Invalid or expired reset link');
      } else {
        console.log('ResetPassword DEBUG: Session established successfully!');
      }
    });
  }, []); // Remove searchParams dependency since we're not using it

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

      navigate('/login?reset=success');
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
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Music, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { validatePassword, validatePasswordMatch } from '@/utils/passwordValidation';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  // Redirect authenticated users to dashboard (except during password recovery)
  useEffect(() => {
    const type = searchParams.get('type');
    if (user && type !== 'recovery') {
      navigate('/dashboard');
    }
  }, [user, navigate, searchParams]);

  // Validate token on mount
  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const type = searchParams.get('type');
    
    console.log('ResetPassword: URL params', { accessToken: !!accessToken, type });
    
    if (!accessToken || type !== 'recovery') {
      console.log('ResetPassword: Invalid token or type');
      setIsValidToken(false);
      return;
    }

    // Exchange the code for session using the new flow
    console.log('ResetPassword: Exchanging token');
    supabase.auth.exchangeCodeForSession(accessToken).then(({ error }) => {
      console.log('ResetPassword: Exchange result', { error });
      setIsValidToken(!error);
      if (error) {
        console.error('Token exchange error:', error);
        setError('Invalid or expired reset link');
      } else {
        console.log('ResetPassword: Token exchange successful, showing form');
      }
    });
  }, [searchParams]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join('. '));
      setIsLoading(false);
      return;
    }

    // Validate password match
    if (!validatePasswordMatch(password, confirmPassword)) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      // Sign out to force fresh login
      await supabase.auth.signOut();
      
      toast({
        title: "Password updated",
        description: "Your password has been successfully updated. Please sign in with your new password."
      });

      navigate('/login?reset=success');
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
      toast({
        title: "Error",
        description: err.message || 'Failed to update password',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show nothing until token validation resolves
  if (isValidToken === null) {
    return null;
  }

  if (isValidToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Invalid Reset Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                Reset links expire after 1 hour. Please request a new password reset from the login page.
              </AlertDescription>
            </Alert>
            
            <Button onClick={() => navigate('/auth')} className="w-full">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="w-full max-w-sm mx-auto mt-24">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Music className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Reset your password</CardTitle>
          <CardDescription>
            Choose a strong password for your SeshPrep account
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters with uppercase, lowercase, and number
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
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
              {isLoading ? 'Updating Password...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
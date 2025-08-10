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
  const [email, setEmail] = useState('');
  const [needsEmail, setNeedsEmail] = useState(false);
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

      const emailParam = url.searchParams.get('email') || localStorage.getItem('reset_email') || '';
      if (emailParam) {
        setEmail(emailParam);
      }

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

      // 2) Fallback: some older/custom emails pass token_hash as access_token only
      const access_token = hashParams.get('access_token');
      const refresh_token = hashParams.get('refresh_token');
      if (access_token && !refresh_token && !code) {
        const token = access_token;
        const isLikelyOtp = /^[0-9]{6}$/.test(token) || token.length < 40;
        if (isLikelyOtp) {
          console.log('ResetPassword DEBUG: Detected OTP-style token, attempting verifyOtp with email');
          if (emailParam) {
            try {
              const { data, error } = await supabase.auth.verifyOtp({
                type: 'recovery',
                token,
                email: emailParam
              });
              if (error) console.error('ResetPassword DEBUG: verifyOtp (OTP) failed', error);
              else console.log('ResetPassword DEBUG: verifyOtp (OTP) success, session?', !!data.session);
            } catch (e) {
              console.error('ResetPassword DEBUG: verifyOtp (OTP) threw', e);
            }
          } else {
            console.warn('ResetPassword DEBUG: OTP token present but no email available; prompting for email');
            setNeedsEmail(true);
          }
        } else {
          console.log('ResetPassword DEBUG: Detected token_hash, verifying via verifyOtp');
          try {
            const { data, error } = await supabase.auth.verifyOtp({
              type: 'recovery',
              token_hash: token
            });
            if (error) console.error('ResetPassword DEBUG: verifyOtp (hash) failed', error);
            else console.log('ResetPassword DEBUG: verifyOtp (hash) success, session?', !!data.session);
          } catch (e) {
            console.error('ResetPassword DEBUG: verifyOtp (hash) threw', e);
          }
        }
      }

      // 3) Legacy flow: access_token and refresh_token present in hash
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
        const isLikelyOtp = access_token && !refresh_token && !code && (/^[0-9]{6}$/.test(access_token) || access_token.length < 40);
        if (isLikelyOtp && !emailParam) {
          console.warn('ResetPassword DEBUG: No session yet; awaiting user email to verify OTP');
          setNeedsEmail(true);
          setIsValidToken(true);
          return;
        }
        console.warn('ResetPassword DEBUG: No session after processing link');
        setIsValidToken(false);
        return;
      }

      console.log('ResetPassword DEBUG: Recovery link detected and session present, showing form');
      // If we have a password saved from a previous attempt, auto-populate and try update
      const pendingPass = sessionStorage.getItem('pending_password');
      const pendingConfirm = sessionStorage.getItem('pending_confirm');
      if (pendingPass && pendingConfirm) {
        setPassword(pendingPass);
        setConfirmPassword(pendingConfirm);
        sessionStorage.removeItem('pending_password');
        sessionStorage.removeItem('pending_confirm');
      }
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
      // Ensure we have an auth session before updating the password
      const ensureSession = async () => {
        const url = new URL(window.location.href);
        const hash = url.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        const code = url.searchParams.get('code');
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');

        const { data: { session } } = await supabase.auth.getSession();
        if (session) return true;

        try {
          if (code) {
            console.log('ResetPassword DEBUG: Re-exchanging code for session before update');
            await supabase.auth.exchangeCodeForSession(window.location.href);
          } else if (access_token && refresh_token) {
            console.log('ResetPassword DEBUG: Re-setting session from hash before update');
            await supabase.auth.setSession({ access_token, refresh_token });
          } else if (access_token && !refresh_token) {
            const isLikelyOtp = /^[0-9]{6}$/.test(access_token) || access_token.length < 40;
            if (isLikelyOtp) {
              if (!email) {
                throw new Error('Please enter the email you requested the reset with, then try again.');
              }
              console.log('ResetPassword DEBUG: Verifying OTP with email before update');
              await supabase.auth.verifyOtp({ type: 'recovery', token: access_token, email });
            } else {
              console.log('ResetPassword DEBUG: Verifying token_hash before update');
              await supabase.auth.verifyOtp({ type: 'recovery', token_hash: access_token });
            }
          }
        } catch (e) {
          console.error('ResetPassword DEBUG: ensureSession failed', e);
        }

        const check = await supabase.auth.getSession();
        return !!check.data.session;
      };

      const hasSession = await ensureSession();
      if (!hasSession) {
        setError('This reset link is invalid or expired. Please request a new one.');
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        // If auth session missing, try one more robust recovery path
        if (String(error.message).toLowerCase().includes('auth session missing')) {
          const url = new URL(window.location.href);
          const hash = url.hash.substring(1);
          const hashParams = new URLSearchParams(hash);
          const access_token = hashParams.get('access_token');
          const refresh_token = hashParams.get('refresh_token');

          // Save password to restore after bounce
          sessionStorage.setItem('pending_password', password);
          sessionStorage.setItem('pending_confirm', confirmPassword);

          if (refresh_token && access_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
            const retry = await supabase.auth.updateUser({ password });
            if (retry.error) throw retry.error;
          } else if (access_token) {
            const isLikelyOtp = /^[0-9]{6}$/.test(access_token) || access_token.length < 40;
            if (isLikelyOtp) {
              if (!email) throw error;
              await supabase.auth.verifyOtp({ type: 'recovery', token: access_token, email });
              const retry = await supabase.auth.updateUser({ password });
              if (retry.error) throw retry.error;
            } else {
              const redirectTo = `${window.location.origin}/reset-password`;
              window.location.replace(`https://ayqvnclmnepqyhvjqxjy.supabase.co/auth/v1/verify?token_hash=${access_token}&type=recovery&redirect_to=${encodeURIComponent(redirectTo)}`);
              return;
            }
          } else {
            throw error;
          }
        } else {
          throw error;
        }
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
            {needsEmail && (
              <div className="space-y-2">
                <Label htmlFor="resetEmail">Email used for reset</Label>
                <Input
                  id="resetEmail"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            )}
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
              disabled={isLoading || !password || !confirmPassword || (needsEmail && !email)}
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
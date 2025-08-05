import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Music } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ForgotPasswordModal } from '@/components/auth/ForgotPasswordModal';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationEmail, setInvitationEmail] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'producer' as 'producer' | 'assistant'
  });

  // Check for invitation token on mount
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      validateInvitationToken(token);
    }
  }, [searchParams]);

  const validateInvitationToken = async (token: string) => {
    try {
      const { data, error } = await supabase
        .from('invitation_tokens')
        .select('email, expires_at, used_at, project_id')
        .eq('token', token)
        .single();

      if (error || !data) {
        setError('Invalid invitation link');
        return;
      }

      if (data.used_at) {
        setError('This invitation has already been used');
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired');
        return;
      }

      setInvitationToken(token);
      setInvitationEmail(data.email);
      setFormData(prev => ({ ...prev, email: data.email }));
      
      toast({
        title: "Invitation found",
        description: `You've been invited to join a project. Please complete your signup.`,
      });
    } catch (err) {
      console.error('Error validating invitation token:', err);
      setError('Failed to validate invitation');
    }
  };

  // Redirect if already logged in (except during password recovery)
  const isRecovery = location.pathname === '/reset-password' && location.search.includes('type=recovery');
  if (user && !isRecovery) {
    navigate('/dashboard');
    return null;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error } = await signIn(formData.email, formData.password);
    
    if (error) {
      setError(error.message);
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive"
      });
    } else {
      navigate('/dashboard');
    }
    
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error } = await signUp(formData.email, formData.password, formData.role);
    
    if (error) {
      setError(error.message);
      toast({
        title: "Error creating account",
        description: error.message,
        variant: "destructive"
      });
    } else {
      // If this was from an invitation, mark the token as used
      if (invitationToken) {
        try {
          await supabase
            .from('invitation_tokens')
            .update({ used_at: new Date().toISOString() })
            .eq('token', invitationToken);
          
          toast({
            title: "Account created!",
            description: "Welcome to the team! Please check your email to verify your account."
          });
        } catch (tokenError) {
          console.error('Error updating invitation token:', tokenError);
          toast({
            title: "Account created!",
            description: "Please check your email to verify your account."
          });
        }
      } else {
        toast({
          title: "Account created!",
          description: "Please check your email to verify your account."
        });
      }
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Music className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to SeshPrep</CardTitle>
          <CardDescription>
            Manage your music production projects with precision
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="producer@studio.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
                
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="producer@studio.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    disabled={!!invitationEmail}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    minLength={6}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: 'producer' | 'assistant') => 
                      setFormData(prev => ({ ...prev, role: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="producer">Producer</SelectItem>
                      <SelectItem value="assistant">Assistant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      <ForgotPasswordModal 
        open={showForgotPassword} 
        onOpenChange={setShowForgotPassword} 
      />
    </div>
  );
}
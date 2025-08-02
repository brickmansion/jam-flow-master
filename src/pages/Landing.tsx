import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Music, CheckSquare, Users, Clock, Zap, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/Navbar';

export default function Landing() {
  const { user, demoSignIn } = useAuth();

  const handleDemoLogin = async () => {
    await demoSignIn();
  };

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Navbar />
      
      {/* Hero Section */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Music className="mr-2 h-4 w-4" />
            Professional Music Production Management
          </div>
          
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Streamline Your
            <span className="brand-gradient bg-clip-text text-transparent"> Music Projects</span>
          </h1>
          
          <p className="mb-8 text-xl text-muted-foreground">
            SeshPrep helps music producers and engineers manage complex recording projects
            with precision. Track tasks, manage checklists, and collaborate seamlessly.
          </p>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
              <Link to="/auth">Get Started</Link>
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={handleDemoLogin}
            >
              Preview Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Everything You Need for Professional Music Production
          </h2>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <CheckSquare className="mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-xl font-semibold">Smart Checklists</h3>
                <p className="text-muted-foreground">
                  Pre-built templates for mixing, mastering, and recording workflows.
                  Never miss a critical step again.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <Users className="mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-xl font-semibold">Team Collaboration</h3>
                <p className="text-muted-foreground">
                  Assign tasks to team members, track progress, and maintain clear
                  communication throughout your projects.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <Clock className="mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-xl font-semibold">Deadline Management</h3>
                <p className="text-muted-foreground">
                  Set due dates, track progress, and get automated notifications
                  to keep your projects on schedule.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <Zap className="mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-xl font-semibold">Workflow Automation</h3>
                <p className="text-muted-foreground">
                  Automatically advance tasks through your workflow stages.
                  Focus on creating, not managing.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <Shield className="mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-xl font-semibold">External Link Integration</h3>
                <p className="text-muted-foreground">
                  Connect your WeTransfer, Dropbox, and other external links
                  directly to your project tasks.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <Music className="mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-xl font-semibold">Audio-Focused</h3>
                <p className="text-muted-foreground">
                  Built specifically for music production with features
                  tailored to audio professionals.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold">Ready to Get Started?</h2>
          <p className="mb-8 text-xl text-muted-foreground">
            Join professional producers and engineers who trust SeshPrep
            to manage their most important projects.
          </p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
            <Link to="/auth">Start Your Free Trial</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
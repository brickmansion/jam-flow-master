import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Music, User, Settings, LogOut, Palette, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';
import { CommandPalette } from '@/components/CommandPalette';
import { useWorkspace } from '@/hooks/useWorkspace';
import { UpgradeModal } from '@/components/UpgradeModal';

interface NavbarProps {
  title?: string;
}

export function Navbar({ title = 'SeshPrep' }: NavbarProps) {
  const { user, profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const { workspace, isTrialActive, trialDaysLeft, isProAccess } = useWorkspace();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Listen for Cmd/Ctrl+K
  useState(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <>
      <nav className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex h-16 items-center px-4">
          {/* Logo */}
          <Link to={user ? '/dashboard' : '/'} className="flex items-center">
            <img
              src="/lovable-uploads/808401e9-a790-4b71-9a6e-13ee514ef587.png"
              alt="SeshPrep logo"
              width={120}
              height={120}
              className="select-none"
            />
          </Link>

          {/* Trial Status Badge */}
          {user && isTrialActive && (
            <Badge variant="secondary" className="ml-4 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
              Trial: {trialDaysLeft} days left
            </Badge>
          )}

          <div className="ml-auto flex items-center space-x-4">
            {/* Theme Toggle */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              <Palette className="h-4 w-4" />
            </Button>

            {user && (
              <>
                {/* Command Palette Trigger */}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsCommandOpen(true)}
                  className="hidden sm:flex"
                >
                  <span className="text-xs text-muted-foreground">⌘K</span>
                </Button>

                {/* Role Badge */}
                {profile?.role && (
                  <Badge variant={profile.role === 'producer' ? 'default' : 'secondary'}>
                    {profile.role}
                  </Badge>
                )}

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <User className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}

            {user && !isProAccess && (
              <Button 
                onClick={() => setUpgradeModalOpen(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Crown className="mr-2 h-4 w-4" />
                Upgrade to Pro
              </Button>
            )}
          </div>
        </div>
      </nav>

      <CommandPalette open={isCommandOpen} onOpenChange={setIsCommandOpen} />
      <UpgradeModal open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen} />
    </>
  );
}
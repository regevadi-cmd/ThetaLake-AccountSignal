'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Settings, Shield, Info } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

interface UserMenuProps {
  onSettingsClick?: () => void;
  onAboutClick?: () => void;
}

export function UserMenu({ onSettingsClick, onAboutClick }: UserMenuProps) {
  const { profile, signOut, isAdmin } = useAuth();

  if (!profile) return null;

  const initials = profile.displayName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || profile.email[0].toUpperCase();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-background">
          <Avatar className="h-8 w-8 border border-border">
            <AvatarImage src={profile.avatarUrl || undefined} alt={profile.displayName || 'User'} />
            <AvatarFallback className="bg-muted text-foreground text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          {isAdmin && (
            <span title="Administrator">
              <Shield className="w-4 h-4 text-amber-400" />
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-3 py-2">
          <p className="text-sm font-medium text-foreground truncate">
            {profile.displayName || 'User'}
          </p>
          <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
          {isAdmin && (
            <div className="flex items-center gap-1 mt-1">
              <Shield className="w-3 h-3 text-amber-400" />
              <span className="text-xs text-amber-400">Administrator</span>
            </div>
          )}
        </div>
        <DropdownMenuSeparator />
        {isAdmin && onSettingsClick && (
          <>
            <DropdownMenuItem
              onClick={onSettingsClick}
              className="cursor-pointer"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {onAboutClick && (
          <DropdownMenuItem
            onClick={onAboutClick}
            className="cursor-pointer"
          >
            <Info className="w-4 h-4 mr-2" />
            About
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <div className="px-1 py-1">
          <ThemeToggle />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

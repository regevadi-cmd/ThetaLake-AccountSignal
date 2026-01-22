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
        <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-950">
          <Avatar className="h-8 w-8 border border-zinc-700">
            <AvatarImage src={profile.avatarUrl || undefined} alt={profile.displayName || 'User'} />
            <AvatarFallback className="bg-zinc-800 text-white text-sm">
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
      <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-zinc-800">
        <div className="px-3 py-2">
          <p className="text-sm font-medium text-white truncate">
            {profile.displayName || 'User'}
          </p>
          <p className="text-xs text-zinc-400 truncate">{profile.email}</p>
          {isAdmin && (
            <div className="flex items-center gap-1 mt-1">
              <Shield className="w-3 h-3 text-amber-400" />
              <span className="text-xs text-amber-400">Administrator</span>
            </div>
          )}
        </div>
        <DropdownMenuSeparator className="bg-zinc-800" />
        {isAdmin && onSettingsClick && (
          <>
            <DropdownMenuItem
              onClick={onSettingsClick}
              className="text-zinc-300 focus:text-white focus:bg-zinc-800 cursor-pointer"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800" />
          </>
        )}
        {onAboutClick && (
          <DropdownMenuItem
            onClick={onAboutClick}
            className="text-zinc-300 focus:text-white focus:bg-zinc-800 cursor-pointer"
          >
            <Info className="w-4 h-4 mr-2" />
            About
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-zinc-300 focus:text-white focus:bg-zinc-800 cursor-pointer"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

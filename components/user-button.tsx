"use client";

import { useAuth } from "./auth-provider";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface UserButtonProps {
  colorModeToggle?: () => void;
}

export function UserButton({ colorModeToggle }: UserButtonProps) {
  const { wallet, logout } = useAuth();

  if (!wallet) return null;

  const initials = wallet.displayName
    ? wallet.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : wallet.email
    ? wallet.email[0].toUpperCase()
    : "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            {wallet.displayName && (
              <p className="text-sm font-medium leading-none">
                {wallet.displayName}
              </p>
            )}
            {wallet.email && (
              <p className="text-xs leading-none text-muted-foreground">
                {wallet.email}
              </p>
            )}
            <p className="text-xs leading-none text-muted-foreground">
              Wallet: {wallet.wallet_id.slice(0, 8)}...
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {colorModeToggle && (
          <>
            <DropdownMenuItem onClick={colorModeToggle}>
              Toggle theme
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={logout} className="text-red-600">
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

'use client';

import { UserButton } from "./user-button";
import { useAuth } from "./auth-provider";
import { useTheme } from "next-themes";
import { Logo } from "./logo";

export default function HandlerHeader() {
  const { isAuthenticated } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <>
      <header className="fixed w-full z-50 p-4 h-14 flex items-center py-4 border-b justify-between bg-background">
        <Logo link={isAuthenticated ? "/dashboard" : "/"}/>

        <div className="flex items-center justify-end gap-5">
          <UserButton colorModeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
        </div>
      </header>
      <div className="min-h-14"/> {/* Placeholder for fixed header */}
    </>
  );
}
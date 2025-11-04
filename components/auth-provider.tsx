"use client";

import { WalletContext } from "@/lib/auth";
import React, { createContext, useContext, useEffect, useState } from "react";

interface AuthContextType {
  wallet: WalletContext | null;
  apiKey: string | null;
  isAuthenticated: boolean;
  login: (apiKey: string, wallet: WalletContext) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  wallet: null,
  apiKey: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<WalletContext | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Load from localStorage on mount
    const storedApiKey = localStorage.getItem("logline_api_key");
    const storedWallet = localStorage.getItem("logline_wallet");

    if (storedApiKey && storedWallet) {
      try {
        const parsedWallet = JSON.parse(storedWallet);
        setApiKey(storedApiKey);
        setWallet(parsedWallet);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Failed to parse stored wallet:", error);
        logout();
      }
    }
  }, []);

  const login = (newApiKey: string, newWallet: WalletContext) => {
    localStorage.setItem("logline_api_key", newApiKey);
    localStorage.setItem("logline_wallet", JSON.stringify(newWallet));
    setApiKey(newApiKey);
    setWallet(newWallet);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("logline_api_key");
    localStorage.removeItem("logline_wallet");
    setApiKey(null);
    setWallet(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{ wallet, apiKey, isAuthenticated, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useWallet() {
  const { wallet } = useAuth();
  return wallet;
}

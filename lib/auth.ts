/**
 * LogLineOS Auth Integration
 * Ledger-native authentication with API Keys, Wallets, and Ed25519 signatures
 */

export interface WalletContext {
  wallet_id: string;
  tenant_id: string;
  scopes: string[];
  displayName?: string;
  email?: string;
}

export interface AuthSession {
  wallet: WalletContext;
  apiKey: string;
  isAuthenticated: boolean;
}

/**
 * Validate API Key with LogLineOS
 */
export async function validateApiKey(apiKey: string): Promise<WalletContext | null> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_LOGLINE_API_URL}/auth/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `ApiKey ${apiKey}`
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      wallet_id: data.wallet_id,
      tenant_id: data.tenant_id,
      scopes: data.scopes || [],
      displayName: data.display_name,
      email: data.email
    };
  } catch (error) {
    console.error('API Key validation failed:', error);
    return null;
  }
}

/**
 * Sign a span with the Wallet (Ed25519 + BLAKE3)
 */
export async function signSpan(
  apiKey: string,
  spanData: Record<string, any>
): Promise<{ signature: string; span_id: string } | null> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_LOGLINE_API_URL}/wallet/sign.span`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `ApiKey ${apiKey}`
      },
      body: JSON.stringify(spanData)
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Span signing failed:', error);
    return null;
  }
}

/**
 * Check if user has required scope
 */
export function hasScope(wallet: WalletContext, requiredScope: string): boolean {
  return wallet.scopes.some(scope => {
    if (scope === requiredScope) return true;
    if (scope.endsWith('.*')) {
      const prefix = scope.slice(0, -2);
      return requiredScope.startsWith(prefix);
    }
    return false;
  });
}

/**
 * Get current auth session (client-side)
 */
export function getAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  
  const apiKey = localStorage.getItem('logline_api_key');
  const walletData = localStorage.getItem('logline_wallet');
  
  if (!apiKey || !walletData) return null;
  
  try {
    const wallet = JSON.parse(walletData) as WalletContext;
    return {
      wallet,
      apiKey,
      isAuthenticated: true
    };
  } catch {
    return null;
  }
}

/**
 * Set auth session (client-side)
 */
export function setAuthSession(apiKey: string, wallet: WalletContext): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('logline_api_key', apiKey);
  localStorage.setItem('logline_wallet', JSON.stringify(wallet));
}

/**
 * Clear auth session (logout)
 */
export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('logline_api_key');
  localStorage.removeItem('logline_wallet');
}

/**
 * Fetch user teams/tenants
 */
export async function getUserTeams(apiKey: string): Promise<Array<{
  tenant_id: string;
  name: string;
  role: string;
}>> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_LOGLINE_API_URL}/tenants`, {
      headers: {
        'Authorization': `ApiKey ${apiKey}`
      }
    });

    if (!response.ok) {
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch teams:', error);
    return [];
  }
}

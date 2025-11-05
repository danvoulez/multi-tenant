/**
 * LogLineOS Auth Integration
 * Ledger-native authentication with API Keys, Wallets, and Ed25519 signatures
 * 
 * Constitutional Compliance:
 * - §9 Constitutional Invariants: clock_present, who_required, traceability
 * - §13 Idempotency & Trace: trace_id, idempotency_key
 */

import { createIdempotencyKey, createTraceId, getCurrentClock } from "./governance/span";

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
 * Span data with constitutional requirements.
 * 
 * §9: MUST include clock.ts, clock.tz, who.id, who.role
 * §13: MUST include trace_id, idempotency_key
 */
export interface ConstitutionalSpan {
  tenant_id: string;
  app: string;
  resource: {
    type: string;
    id: string;
    [key: string]: any;
  };
  who: {
    id: string;
    role: string;
  };
  clock: {
    ts: string;
    tz: string;
  };
  trace_id: string;
  idempotency_key: string;
  [key: string]: any;
}

/**
 * Validate API Key with LogLineOS
 */
export async function validateApiKey(apiKey: string): Promise<WalletContext | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_LOGLINE_API_URL || "";
    const response = await fetch(`${apiUrl}/auth/validate`, {
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
 * 
 * Now includes constitutional requirements automatically:
 * - §9: clock.ts, clock.tz (from getCurrentClock)
 * - §13: trace_id, idempotency_key
 */
export async function signSpan(
  apiKey: string,
  spanData: Partial<ConstitutionalSpan>,
  timezone: string = "Europe/Paris"
): Promise<{ signature: string; span_id: string } | null> {
  try {
    // §13: Add trace_id and idempotency_key if missing
    const trace_id = spanData.trace_id || createTraceId();
    const idempotency_key = spanData.idempotency_key || createIdempotencyKey();
    
    // §9: Add clock if missing
    const clock = spanData.clock || getCurrentClock(timezone);
    
    const constitutionalSpan: ConstitutionalSpan = {
      ...spanData,
      trace_id,
      idempotency_key,
      clock,
    } as ConstitutionalSpan;

    const apiUrl = process.env.NEXT_PUBLIC_LOGLINE_API_URL || "";
    const response = await fetch(`${apiUrl}/wallet/sign.span`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `ApiKey ${apiKey}`
      },
      body: JSON.stringify(constitutionalSpan)
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
    const apiUrl = process.env.NEXT_PUBLIC_LOGLINE_API_URL || "";
    const response = await fetch(`${apiUrl}/tenants`, {
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

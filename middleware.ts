import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * LogLineOS Auth Middleware
 * Validates API Keys and enforces tenant isolation
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes (landing page, auth pages)
  const publicPaths = ['/', '/auth', '/api/public'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Protected routes require API Key
  const apiKey = request.headers.get('authorization')?.replace('ApiKey ', '') ||
                 request.cookies.get('logline_api_key')?.value;

  if (!apiKey) {
    // Redirect to auth page
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  try {
    // Validate API Key with LogLineOS
    const response = await fetch(`${process.env.NEXT_PUBLIC_LOGLINE_API_URL}/auth/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `ApiKey ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error('Invalid API Key');
    }

    const walletContext = await response.json();

    // Inject wallet context into request headers for downstream use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-wallet-id', walletContext.wallet_id);
    requestHeaders.set('x-tenant-id', walletContext.tenant_id);
    requestHeaders.set('x-scopes', JSON.stringify(walletContext.scopes));

    // For team-specific routes, validate tenant access
    const teamMatch = pathname.match(/\/dashboard\/([^\/]+)/);
    if (teamMatch) {
      const requestedTenantId = teamMatch[1];
      if (requestedTenantId !== walletContext.tenant_id) {
        // User trying to access different tenant - redirect to their tenant
        const url = request.nextUrl.clone();
        url.pathname = `/dashboard/${walletContext.tenant_id}`;
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  } catch (error) {
    console.error('Auth middleware error:', error);
    
    // Clear invalid cookie and redirect to login
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('from', pathname);
    
    const response = NextResponse.redirect(url);
    response.cookies.delete('logline_api_key');
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/public).*)',
  ],
};

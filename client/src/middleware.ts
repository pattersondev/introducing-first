import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Clone the response
  const response = NextResponse.next()

  // Add security headers
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  
  // Add server timing header for performance monitoring
  response.headers.set('Server-Timing', 'miss, db;dur=53, app;dur=47.2')
  
  // Enable early hints for critical resources
  response.headers.set('Link', '</fonts/inter.woff2>; rel=preload; as=font; crossorigin, </css/main.css>; rel=preload; as=style')

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 
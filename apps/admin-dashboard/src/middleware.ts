import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'grupiah_default_super_secret_key_change_in_production'
);

export async function middleware(request: NextRequest) {
    // Allow access to login page and authentication API route
    if (
        request.nextUrl.pathname === '/login' ||
        request.nextUrl.pathname.startsWith('/api/auth') ||
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.includes('.') // allow static files (favicon, etc)
    ) {
        return NextResponse.next();
    }

    // Attempt to read the secure token from cookies
    const token = request.cookies.get('admin_token')?.value;

    // No token? Redirect to login
    if (!token) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    try {
        // Verify the JWT signature
        await jwtVerify(token, JWT_SECRET);
        return NextResponse.next();
    } catch (error) {
        // Invalid or expired token, redirect to login
        console.warn("Invalid JWT cookie signature:", error);
        const loginUrl = new URL('/login', request.url);
        // Clear the bad cookie
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete('admin_token');
        return response;
    }
}

export const config = {
    // Apply middleware to all routes except API (handled separately if needed) and static files
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

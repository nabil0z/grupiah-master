import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'grupiah_default_super_secret_key_change_in_production'
);

const ADMIN_PASSWORD = process.env.ADMIN_WEB_PASSWORD || '1234';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();

        if (password !== ADMIN_PASSWORD) {
            return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
        }

        // Sign the JWT payload
        const token = await new SignJWT({ role: 'superadmin' })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h') // Expire in 24 hours
            .sign(JWT_SECRET);

        const response = NextResponse.json({ success: true });

        // Set HttpOnly secure cookie
        response.cookies.set('admin_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24, // 24 hours in seconds
            path: '/',
        });

        return response;
    } catch (error) {
        console.error("Login Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

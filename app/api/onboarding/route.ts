import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { getDb } from '@/lib/db';
import { signToken } from '@/lib/auth';

const JWT_COOKIE_NAME = 'homepage3_session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validation
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if any users exist
    const existingUsers = db
      .prepare('SELECT COUNT(*) as count FROM users')
      .get() as { count: number };

    if (existingUsers.count > 0) {
      return NextResponse.json(
        { error: 'Onboarding already completed' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hash(password, 12);

    // Create superuser
    const result = db
      .prepare(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
      )
      .run(username, passwordHash, 'superuser');

    // Update settings to mark onboarding as complete
    db.prepare(
      "UPDATE settings SET value = 'true' WHERE key = 'onboarding_complete'"
    ).run();

    // Create JWT token
    const token = await signToken({
      userId: result.lastInsertRowid as number,
      username,
      role: 'superuser',
    });

    // Create response with cookie
    const response = NextResponse.json(
      {
        success: true,
        message: 'Superuser created successfully',
      },
      { status: 201 }
    );

    // Set cookie on response
    // Only use secure flag if using HTTPS (not just in production)
    response.cookies.set(JWT_COOKIE_NAME, token, {
      httpOnly: true,
      secure: false, // Set to true only if using HTTPS
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours in seconds
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to create superuser' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';

const JWT_COOKIE_NAME = 'homepage3_session';

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logout successful',
    });

    // Delete cookie from response
    response.cookies.delete(JWT_COOKIE_NAME);

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}

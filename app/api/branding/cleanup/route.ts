import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { cleanupOrphanedIcons, getCacheStats } from '@/lib/services/assetCleanup';

/**
 * GET /api/branding/cleanup
 * Get cache statistics (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const stats = getCacheStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.error('Cache stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get cache stats' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/branding/cleanup
 * Run orphaned icon cleanup (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    console.log('🧹 Manual cleanup requested');
    const stats = cleanupOrphanedIcons();

    return NextResponse.json({
      success: true,
      data: stats,
      message: `Cleanup complete: ${stats.removed} files removed`,
    });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Failed to run cleanup' },
      { status: 500 }
    );
  }
}

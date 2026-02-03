/**
 * GET /api/notification-rules/metrics
 * Legacy endpoint - deprecated in favor of /api/integrations/[id]/capabilities
 * Returns empty list until UI is migrated to new schema
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    // Return empty array - this endpoint is deprecated
    // UI should use /api/integrations/[id]/capabilities for new system
    return NextResponse.json({
      success: true,
      data: [],
      meta: {
        total: 0,
        deprecated: true,
        message: 'This endpoint is deprecated. Use /api/integrations/[id]/capabilities for new notification system.'
      },
    });
  } catch (error) {
    console.error('Error fetching metric metadata:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to fetch metric metadata' }, { status: 500 });
  }
}

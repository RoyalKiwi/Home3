import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { validateInteger } from '@/lib/validation';
import { monitoringService } from '@/lib/services/monitoring';

/**
 * POST /api/integrations/[id]/poll
 * Manually trigger a poll for testing (admin-only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();

    const { id } = await params;
    const integrationId = parseInt(id, 10);

    validateInteger(integrationId, 'Integration ID', 1);

    // Manually trigger a poll
    const metrics = await monitoringService.pollIntegrationById(integrationId);

    return NextResponse.json({
      success: true,
      data: {
        integrationId,
        metrics,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error polling integration:', error);

    if (error instanceof Error) {
      if (error.message.includes('must be')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (error.message === 'Authentication required') {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      if (error.message === 'Integration not found') {
        return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
      }

      return NextResponse.json({
        error: error.message,
      }, { status: 500 });
    }

    return NextResponse.json({ error: 'Failed to poll integration' }, { status: 500 });
  }
}

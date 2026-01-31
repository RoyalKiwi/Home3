import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { decrypt } from '@/lib/crypto';
import { validateInteger } from '@/lib/validation';
import { createDriver } from '@/lib/services/driverFactory';
import type { Integration, IntegrationCredentials } from '@/lib/types';

/**
 * POST /api/integrations/[id]/test
 * Test connection to integration (admin-only)
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

    const db = getDb();

    // Get integration with credentials
    const integration = db
      .prepare(
        `SELECT
          id,
          service_type,
          credentials
        FROM integrations
        WHERE id = ?`
      )
      .get(integrationId) as Integration | undefined;

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    if (!integration.credentials) {
      return NextResponse.json({ error: 'No credentials configured' }, { status: 400 });
    }

    // Decrypt credentials
    const decryptedCredentials = JSON.parse(
      decrypt(integration.credentials)
    ) as IntegrationCredentials;

    // Create driver and test connection
    const driver = createDriver(
      integration.id,
      integration.service_type,
      decryptedCredentials
    );

    const result = await driver.testConnection();

    // Update last_status in database
    db.prepare(
      `UPDATE integrations
       SET last_status = ?,
           last_poll_at = datetime('now'),
           updated_at = datetime('now')
       WHERE id = ?`
    ).run(result.success ? 'connected' : 'failed', integrationId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error testing integration:', error);

    if (error instanceof Error) {
      if (error.message.includes('must be')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (error.message === 'Authentication required') {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      // Return the actual error message for debugging
      return NextResponse.json({
        success: false,
        data: {
          success: false,
          message: error.message,
        },
      });
    }

    return NextResponse.json({ error: 'Failed to test integration' }, { status: 500 });
  }
}

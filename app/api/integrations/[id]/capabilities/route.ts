/**
 * Integration Capabilities API
 * Returns available metrics for an integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { createDriver } from '@/lib/services/driverFactory';
import type { IntegrationCredentials } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const integrationId = parseInt(id, 10);

    if (isNaN(integrationId)) {
      return NextResponse.json({ error: 'Invalid integration ID' }, { status: 400 });
    }

    const db = getDb();
    const integration = db
      .prepare('SELECT * FROM integrations WHERE id = ?')
      .get(integrationId) as any;

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Decrypt credentials and create driver
    const credentials = JSON.parse(decrypt(integration.credentials)) as IntegrationCredentials;
    const driver = createDriver(integrationId, integration.service_type, credentials);

    // Get capabilities from driver (now async - dynamically queries API)
    const capabilities = await driver.getCapabilities();

    return NextResponse.json({
      success: true,
      data: {
        integration_id: integrationId,
        integration_name: integration.service_name,
        integration_type: integration.service_type,
        capabilities,
      },
    });
  } catch (error) {
    console.error('[Capabilities API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch capabilities' },
      { status: 500 }
    );
  }
}

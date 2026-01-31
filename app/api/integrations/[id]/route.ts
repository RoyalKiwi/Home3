import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { encrypt } from '@/lib/crypto';
import { validateString, validateInteger } from '@/lib/validation';
import type { Integration, UpdateIntegrationRequest } from '@/lib/types';

/**
 * GET /api/integrations/[id]
 * Get single integration (admin-only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();

    const { id } = await params;
    const integrationId = parseInt(id, 10);

    validateInteger(integrationId, 'Integration ID', 1);

    const db = getDb();

    const integration = db
      .prepare(
        `SELECT
          id,
          service_name,
          service_type,
          poll_interval,
          is_active,
          last_poll_at,
          last_status,
          created_at,
          updated_at
        FROM integrations
        WHERE id = ?`
      )
      .get(integrationId) as Integration | undefined;

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: integration,
    });
  } catch (error) {
    console.error('Error fetching integration:', error);

    if (error instanceof Error) {
      if (error.message.includes('must be')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (error.message === 'Authentication required') {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
    }

    return NextResponse.json({ error: 'Failed to fetch integration' }, { status: 500 });
  }
}

/**
 * PATCH /api/integrations/[id]
 * Update integration (admin-only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();

    const { id } = await params;
    const integrationId = parseInt(id, 10);

    validateInteger(integrationId, 'Integration ID', 1);

    const body: UpdateIntegrationRequest = await request.json();
    const { service_name, credentials, poll_interval, is_active } = body;

    const db = getDb();

    // Check if integration exists
    const existing = db
      .prepare('SELECT id FROM integrations WHERE id = ?')
      .get(integrationId);

    if (!existing) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (service_name !== undefined) {
      validateString(service_name, 'Service name', 1, 100);
      updates.push('service_name = ?');
      values.push(service_name);
    }

    if (credentials !== undefined) {
      const encryptedCredentials = encrypt(JSON.stringify(credentials));
      updates.push('credentials = ?');
      values.push(encryptedCredentials);
    }

    if (poll_interval !== undefined) {
      validateInteger(poll_interval, 'Poll interval', 1000);
      updates.push('poll_interval = ?');
      values.push(poll_interval);
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push('updated_at = datetime(\'now\')');
    values.push(integrationId);

    const query = `UPDATE integrations SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values);

    // Return updated integration
    const updated = db
      .prepare(
        `SELECT
          id,
          service_name,
          service_type,
          poll_interval,
          is_active,
          last_poll_at,
          last_status,
          created_at,
          updated_at
        FROM integrations
        WHERE id = ?`
      )
      .get(integrationId);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating integration:', error);

    if (error instanceof Error) {
      if (error.message.includes('must be') || error.message.includes('Invalid')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (error.message === 'Authentication required') {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
    }

    return NextResponse.json({ error: 'Failed to update integration' }, { status: 500 });
  }
}

/**
 * DELETE /api/integrations/[id]
 * Delete integration (admin-only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();

    const { id } = await params;
    const integrationId = parseInt(id, 10);

    validateInteger(integrationId, 'Integration ID', 1);

    const db = getDb();

    // Check if integration exists
    const existing = db
      .prepare('SELECT id FROM integrations WHERE id = ?')
      .get(integrationId);

    if (!existing) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Delete integration
    db.prepare('DELETE FROM integrations WHERE id = ?').run(integrationId);

    return NextResponse.json({
      success: true,
      message: 'Integration deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting integration:', error);

    if (error instanceof Error) {
      if (error.message.includes('must be')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (error.message === 'Authentication required') {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
    }

    return NextResponse.json({ error: 'Failed to delete integration' }, { status: 500 });
  }
}

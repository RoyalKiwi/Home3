import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { encrypt } from '@/lib/crypto';
import { validateString, validateInteger } from '@/lib/validation';
import type { Integration, CreateIntegrationRequest } from '@/lib/types';

/**
 * GET /api/integrations
 * List all integrations (admin-only)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const db = getDb();

    const integrations = db
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
        ORDER BY created_at DESC`
      )
      .all() as Integration[];

    // Note: credentials are excluded from response for security

    return NextResponse.json({
      success: true,
      data: integrations,
    });
  } catch (error) {
    console.error('Error fetching integrations:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 });
  }
}

/**
 * POST /api/integrations
 * Create new integration (admin-only)
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body: CreateIntegrationRequest = await request.json();
    const { service_name, service_type, credentials, poll_interval, is_active } = body;

    // Validation
    validateString(service_name, 'Service name', 1, 100);

    if (!['uptime-kuma', 'netdata', 'unraid'].includes(service_type)) {
      throw new Error('Invalid service type');
    }

    if (!credentials) {
      throw new Error('Credentials are required');
    }

    // Validate poll interval if provided
    if (poll_interval !== undefined) {
      validateInteger(poll_interval, 'Poll interval', 1000);
    }

    const db = getDb();

    // Encrypt credentials
    const encryptedCredentials = encrypt(JSON.stringify(credentials));

    // Create integration
    const result = db
      .prepare(
        `INSERT INTO integrations (
          service_name,
          service_type,
          credentials,
          poll_interval,
          is_active
        ) VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        service_name,
        service_type,
        encryptedCredentials,
        poll_interval || 30000, // Default 30 seconds
        is_active !== undefined ? (is_active ? 1 : 0) : 1
      );

    // Return created integration (without credentials)
    const newIntegration = db
      .prepare(
        `SELECT
          id,
          service_name,
          service_type,
          poll_interval,
          is_active,
          created_at,
          updated_at
        FROM integrations
        WHERE id = ?`
      )
      .get(result.lastInsertRowid);

    return NextResponse.json({
      success: true,
      data: newIntegration,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating integration:', error);

    if (error instanceof Error) {
      if (error.message.includes('must be') || error.message.includes('Invalid') || error.message.includes('required')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (error.message === 'Authentication required') {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
    }

    return NextResponse.json({ error: 'Failed to create integration' }, { status: 500 });
  }
}

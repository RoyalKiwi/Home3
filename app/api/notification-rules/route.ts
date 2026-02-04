import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import type { NotificationRuleWithDetails, CreateNotificationRuleRequest } from '@/lib/types';

/**
 * GET /api/notification-rules
 * List all notification rules with webhook and integration details (admin-only)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const db = getDb();

    const rules = db
      .prepare(
        `SELECT
          nr.*,
          wc.name as webhook_name,
          wc.provider_type as webhook_provider_type,
          i.service_name as integration_name,
          i.service_type as integration_type
        FROM notification_rules nr
        JOIN webhook_configs wc ON nr.webhook_id = wc.id
        JOIN integrations i ON nr.integration_id = i.id
        ORDER BY nr.created_at DESC`
      )
      .all() as NotificationRuleWithDetails[];

    return NextResponse.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    console.error('Error fetching notification rules:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to fetch notification rules' }, { status: 500 });
  }
}

/**
 * POST /api/notification-rules
 * Create a new notification rule (admin-only)
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = (await request.json()) as CreateNotificationRuleRequest;

    // Validate required fields
    if (!body.name || !body.integration_id || !body.metric_key ||
        !body.operator || body.threshold === undefined || !body.webhook_id) {
      return NextResponse.json(
        {
          error: 'Missing required fields: name, integration_id, metric_key, operator, threshold, webhook_id'
        },
        { status: 400 }
      );
    }

    // Validate operator
    const validOperators = ['gt', 'lt', 'gte', 'lte', 'eq'];
    if (!validOperators.includes(body.operator)) {
      return NextResponse.json(
        { error: 'Invalid operator. Must be one of: gt, lt, gte, lte, eq' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if webhook exists
    const webhook = db.prepare('SELECT id FROM webhook_configs WHERE id = ?').get(body.webhook_id);
    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Check if integration exists
    const integration = db.prepare('SELECT id FROM integrations WHERE id = ?').get(body.integration_id);
    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Insert rule
    const result = db
      .prepare(
        `INSERT INTO notification_rules (
          name, integration_id, metric_key, operator, threshold,
          webhook_id, template_id, severity, cooldown_minutes, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        body.name,
        body.integration_id,
        body.metric_key,
        body.operator,
        body.threshold,
        body.webhook_id,
        body.template_id ?? null,
        body.severity ?? 'warning',
        body.cooldown_minutes ?? 30,
        (body.is_active ?? true) ? 1 : 0
      );

    // Fetch created rule with details
    const rule = db
      .prepare(
        `SELECT
          nr.*,
          wc.name as webhook_name,
          wc.provider_type as webhook_provider_type,
          i.service_name as integration_name,
          i.service_type as integration_type
        FROM notification_rules nr
        JOIN webhook_configs wc ON nr.webhook_id = wc.id
        JOIN integrations i ON nr.integration_id = i.id
        WHERE nr.id = ?`
      )
      .get(result.lastInsertRowid) as NotificationRuleWithDetails;

    return NextResponse.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    console.error('Error creating notification rule:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to create notification rule' }, { status: 500 });
  }
}

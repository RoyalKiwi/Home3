import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import type { UpdateNotificationRuleRequest, NotificationRuleWithDetails } from '@/lib/types';

/**
 * PATCH /api/notification-rules/[id]
 * Update a notification rule (admin-only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();

    const { id } = await params;
    const ruleId = parseInt(id);
    if (isNaN(ruleId)) {
      return NextResponse.json({ error: 'Invalid rule ID' }, { status: 400 });
    }

    const body = (await request.json()) as UpdateNotificationRuleRequest;

    const db = getDb();

    // Check if rule exists
    const existing = db.prepare('SELECT id FROM notification_rules WHERE id = ?').get(ruleId);
    if (!existing) {
      return NextResponse.json({ error: 'Notification rule not found' }, { status: 404 });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (body.name !== undefined) {
      updates.push('name = ?');
      values.push(body.name);
    }

    if (body.integration_id !== undefined) {
      // Validate integration exists
      const integration = db.prepare('SELECT id FROM integrations WHERE id = ?').get(body.integration_id);
      if (!integration) {
        return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
      }
      updates.push('integration_id = ?');
      values.push(body.integration_id);
    }

    if (body.metric_key !== undefined) {
      updates.push('metric_key = ?');
      values.push(body.metric_key);
    }

    if (body.operator !== undefined) {
      const validOperators = ['gt', 'lt', 'gte', 'lte', 'eq'];
      if (!validOperators.includes(body.operator)) {
        return NextResponse.json(
          { error: 'Invalid operator. Must be one of: gt, lt, gte, lte, eq' },
          { status: 400 }
        );
      }
      updates.push('operator = ?');
      values.push(body.operator);
    }

    if (body.threshold !== undefined) {
      updates.push('threshold = ?');
      values.push(body.threshold);
    }

    if (body.webhook_id !== undefined) {
      // Validate webhook exists
      const webhook = db.prepare('SELECT id FROM webhook_configs WHERE id = ?').get(body.webhook_id);
      if (!webhook) {
        return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
      }
      updates.push('webhook_id = ?');
      values.push(body.webhook_id);
    }

    if (body.template_id !== undefined) {
      updates.push('template_id = ?');
      values.push(body.template_id);
    }

    if (body.severity !== undefined) {
      updates.push('severity = ?');
      values.push(body.severity);
    }

    if (body.cooldown_minutes !== undefined) {
      updates.push('cooldown_minutes = ?');
      values.push(body.cooldown_minutes);
    }

    if (body.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(body.is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push('updated_at = datetime(\'now\')');
    values.push(ruleId);

    db.prepare(`UPDATE notification_rules SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    // Fetch updated rule with details
    const updated = db
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
      .get(ruleId) as NotificationRuleWithDetails;

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating notification rule:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to update notification rule' }, { status: 500 });
  }
}

/**
 * DELETE /api/notification-rules/[id]
 * Delete a notification rule (admin-only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();

    const { id } = await params;
    const ruleId = parseInt(id);
    if (isNaN(ruleId)) {
      return NextResponse.json({ error: 'Invalid rule ID' }, { status: 400 });
    }

    const db = getDb();

    // Check if rule exists
    const existing = db.prepare('SELECT id, name FROM notification_rules WHERE id = ?').get(ruleId) as { id: number; name: string } | undefined;
    if (!existing) {
      return NextResponse.json({ error: 'Notification rule not found' }, { status: 404 });
    }

    // Delete rule
    db.prepare('DELETE FROM notification_rules WHERE id = ?').run(ruleId);

    return NextResponse.json({
      success: true,
      data: {
        id: ruleId,
        name: existing.name,
      },
    });
  } catch (error) {
    console.error('Error deleting notification rule:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to delete notification rule' }, { status: 500 });
  }
}

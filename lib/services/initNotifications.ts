/**
 * Notification System Initialization
 * Runs on server startup to ensure all required data exists
 */

import { getDb } from '../db';
import { MetricRegistry } from './metricRegistry';

/**
 * Initialize notification system data
 * Called automatically on server startup
 */
export function initNotificationSystem(): void {
  try {
    console.log('[NotificationInit] Initializing notification system...');

    // Sync metric definitions
    try {
      MetricRegistry.syncDriverCapabilities();
      const metrics = MetricRegistry.getAllMetrics();
      console.log(`[NotificationInit] Metrics synced: ${metrics.length} total`);
    } catch (error) {
      console.error('[NotificationInit] Failed to sync metrics:', error);
    }

    // Seed templates if table is empty
    try {
      const db = getDb();
      const templateCount = db
        .prepare('SELECT COUNT(*) as count FROM notification_templates WHERE is_active = 1')
        .get() as { count: number };

      if (templateCount.count === 0) {
        console.log('[NotificationInit] No templates found, seeding defaults...');

        const defaultTemplates = [
          {
            name: 'Default System Template',
            title: '{{severity}} Alert: {{metricName}}',
            message: '{{integrationName}} - {{metricDisplayName}} is {{metricValue}}{{unit}} (threshold: {{threshold}}{{unit}})',
            isDefault: 1,
          },
          {
            name: 'Detailed Alert',
            title: '🚨 {{severity}} Alert: {{metricName}}',
            message: `Alert triggered for {{cardName}}

**Metric**: {{metricDisplayName}}
**Current Value**: {{metricValue}}{{unit}}
**Threshold**: {{threshold}}{{unit}}
**Source**: {{integrationName}}
**Time**: {{timestamp}}

Please investigate immediately.`,
            isDefault: 0,
          },
          {
            name: 'Minimal Alert',
            title: '{{metricName}}',
            message: '{{metricValue}}{{unit}} ({{threshold}}{{unit}})',
            isDefault: 0,
          },
          {
            name: 'Status Change Alert',
            title: '{{cardName}} Status Changed',
            message: `{{cardName}} status changed from {{oldStatus}} to {{newStatus}}

**Time**: {{timestamp}}`,
            isDefault: 0,
          },
          {
            name: 'Critical Alert (Emoji)',
            title: '🔴 CRITICAL: {{metricName}}',
            message: `⚠️ **CRITICAL ALERT** ⚠️

**System**: {{cardName}}
**Issue**: {{metricDisplayName}} at {{metricValue}}{{unit}}
**Threshold**: {{threshold}}{{unit}}
**Severity**: {{severity}}

🚨 Immediate action required!`,
            isDefault: 0,
          },
        ];

        for (const template of defaultTemplates) {
          db.prepare(`
            INSERT INTO notification_templates (name, title_template, message_template, is_default, is_active)
            VALUES (?, ?, ?, ?, 1)
          `).run(template.name, template.title, template.message, template.isDefault);
        }

        console.log(`[NotificationInit] Seeded ${defaultTemplates.length} default templates`);
      } else {
        console.log(`[NotificationInit] Templates already exist: ${templateCount.count} templates`);
      }
    } catch (error) {
      console.error('[NotificationInit] Failed to seed templates:', error);
    }

    console.log('[NotificationInit] Initialization complete');
  } catch (error) {
    console.error('[NotificationInit] Initialization failed:', error);
  }
}

// Auto-initialize on module load (server-side only)
if (typeof window === 'undefined') {
  try {
    initNotificationSystem();
  } catch (error) {
    console.error('[NotificationInit] Auto-initialization failed:', error);
  }
}

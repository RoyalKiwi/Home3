/**
 * Monitoring Orchestrator
 * Polls all active integrations and broadcasts updates via SSE
 */

import { getDb } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { createDriver } from './driverFactory';
import type { Integration, IntegrationCredentials, MetricCapability } from '@/lib/types';

class MonitoringService {
  private pollingInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start the monitoring service
   */
  start() {
    if (this.isRunning) {
      console.log('[Monitoring] Service already running');
      return;
    }

    console.log('[Monitoring] Starting monitoring service');
    this.isRunning = true;

    // Initial poll
    this.pollAll();

    // Set up recurring polling (every 30 seconds)
    this.pollingInterval = setInterval(() => {
      this.pollAll();
    }, 30000);
  }

  /**
   * Stop the monitoring service
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('[Monitoring] Stopping monitoring service');
    this.isRunning = false;

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Poll all active integrations
   */
  private async pollAll() {
    try {
      const db = getDb();

      // Get all active integrations
      const integrations = db
        .prepare('SELECT * FROM integrations WHERE is_active = 1')
        .all() as Integration[];

      if (integrations.length === 0) {
        console.log('[Monitoring] No active integrations to poll');
        return;
      }

      console.log(`[Monitoring] Polling ${integrations.length} integrations`);

      // Poll each integration independently (fail-silent)
      const results = await Promise.allSettled(
        integrations.map((integration) => this.pollIntegration(integration))
      );

      // Log results
      results.forEach((result, index) => {
        const integration = integrations[index];
        if (result.status === 'rejected') {
          console.error(
            `[Monitoring] Failed to poll ${integration.service_name}:`,
            result.reason
          );
        }
      });
    } catch (error) {
      console.error('[Monitoring] Error in pollAll:', error);
    }
  }

  /**
   * Poll a single integration
   */
  private async pollIntegration(integration: Integration) {
    try {
      if (!integration.credentials) {
        console.warn(`[Monitoring] No credentials for ${integration.service_name}`);
        return;
      }

      // Decrypt credentials
      const credentials = JSON.parse(
        decrypt(integration.credentials)
      ) as IntegrationCredentials;

      // Create driver
      const driver = createDriver(
        integration.id,
        integration.service_type,
        credentials
      );

      // Fetch all supported metrics
      const capabilities = driver.getCapabilities();
      const metricResults: Record<string, any> = {};

      for (const capability of capabilities) {
        try {
          const data = await driver.fetchMetric(capability);
          if (data) {
            metricResults[capability] = data;
          }
        } catch (error) {
          console.error(
            `[Monitoring] Failed to fetch ${capability} from ${integration.service_name}:`,
            error instanceof Error ? error.message : error
          );
        }
      }

      // Update last_poll_at and last_status
      const db = getDb();
      db.prepare(
        `UPDATE integrations
         SET last_poll_at = datetime('now'),
             last_status = ?,
             updated_at = datetime('now')
         WHERE id = ?`
      ).run(
        Object.keys(metricResults).length > 0 ? 'success' : 'partial',
        integration.id
      );

      // Broadcast results via SSE would happen here
      // For now, just log the results
      console.log(
        `[Monitoring] Polled ${integration.service_name}:`,
        Object.keys(metricResults)
      );

      return metricResults;
    } catch (error) {
      // Update status to failed
      const db = getDb();
      db.prepare(
        `UPDATE integrations
         SET last_poll_at = datetime('now'),
             last_status = 'failed',
             updated_at = datetime('now')
         WHERE id = ?`
      ).run(integration.id);

      throw error;
    }
  }

  /**
   * Poll a specific integration on demand
   */
  async pollIntegrationById(integrationId: number) {
    const db = getDb();

    const integration = db
      .prepare('SELECT * FROM integrations WHERE id = ?')
      .get(integrationId) as Integration | undefined;

    if (!integration) {
      throw new Error('Integration not found');
    }

    return this.pollIntegration(integration);
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      hasPollingInterval: this.pollingInterval !== null,
    };
  }
}

// Singleton instance
export const monitoringService = new MonitoringService();

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  monitoringService.start();
}

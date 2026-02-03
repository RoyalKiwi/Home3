/**
 * Metrics Event Bus
 * Internal pub/sub for metrics data using Node.js EventEmitter
 * Allows multiple consumers (NotificationEvaluator, SSE, etc.) to subscribe
 */

import { EventEmitter } from 'events';

export interface MetricsPayload {
  integration_id: number;
  integration_name: string;
  integration_type: string;
  timestamp: string;
  data: Record<string, any>;
}

class MetricsEventBus extends EventEmitter {
  /**
   * Publish metrics data to all subscribers
   */
  publish(payload: MetricsPayload) {
    this.emit('metrics', payload);
  }

  /**
   * Subscribe to metrics events
   */
  subscribe(handler: (payload: MetricsPayload) => void | Promise<void>) {
    this.on('metrics', handler);
  }

  /**
   * Unsubscribe from metrics events
   */
  unsubscribe(handler: (payload: MetricsPayload) => void | Promise<void>) {
    this.off('metrics', handler);
  }
}

// Singleton instance
export const metricsEventBus = new MetricsEventBus();

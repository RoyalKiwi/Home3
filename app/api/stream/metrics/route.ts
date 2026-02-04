/**
 * Unified Metrics SSE Stream
 * Broadcasts integration metrics data for notifications and monitoring
 */

import { NextRequest } from 'next/server';
import { metricsSSE } from '@/lib/sse-managers';
import { unifiedPoller } from '@/lib/services/unifiedPoller';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  // Generate unique client ID
  const clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // Create a ReadableStream that manages the SSE connection
  const readableStream = new ReadableStream({
    start(controller) {
      // Register client with metrics SSE manager
      metricsSSE.addClient(clientId, controller);

      console.log(`[MetricsSSE] Client ${clientId} connected`);

      // Start unified poller if not already running
      if (!unifiedPoller.isActive()) {
        console.log('[MetricsSSE] Starting unified poller...');
        unifiedPoller.start();
      }

      // Send connection confirmation
      const connectMessage = `event: connected\ndata: ${JSON.stringify({
        client_id: clientId,
        timestamp: new Date().toISOString()
      })}\n\n`;
      controller.enqueue(encoder.encode(connectMessage));
    },
    cancel() {
      // Client disconnected
      metricsSSE.removeClient(clientId);
      console.log(`[MetricsSSE] Client ${clientId} disconnected (${metricsSSE.getClientCount()} remaining)`);

      // Stop poller if no clients remaining
      if (metricsSSE.getClientCount() === 0) {
        console.log('[MetricsSSE] No clients remaining, stopping unified poller');
        unifiedPoller.stop();
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

/**
 * Unified Metrics SSE Stream
 * Broadcasts integration metrics data for notifications and monitoring
 */

import { NextRequest } from 'next/server';
import { createSSEStream } from '@/lib/sse';
import { metricsSSE } from '@/lib/sse-managers';
import { unifiedPoller } from '@/lib/services/unifiedPoller';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { stream, clientId } = createSSEStream();

  // Register client with metrics SSE manager
  metricsSSE.addClient(clientId, stream);

  console.log(`[MetricsSSE] Client ${clientId} connected`);

  // Start unified poller if not already running
  if (!unifiedPoller.isActive()) {
    console.log('[MetricsSSE] Starting unified poller...');
    unifiedPoller.start();
  }

  // Send connection confirmation
  metricsSSE.sendToClient(clientId, 'connected', {
    client_id: clientId,
    timestamp: new Date().toISOString()
  });

  // Cleanup on disconnect
  request.signal.addEventListener('abort', () => {
    metricsSSE.removeClient(clientId);
    console.log(`[MetricsSSE] Client ${clientId} disconnected (${metricsSSE.getClientCount()} remaining)`);

    // Stop poller if no clients remaining
    if (metricsSSE.getClientCount() === 0) {
      console.log('[MetricsSSE] No clients remaining, stopping unified poller');
      unifiedPoller.stop();
    }
  });

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

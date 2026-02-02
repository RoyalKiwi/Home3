import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { maintenanceSSE } from '@/lib/sse-managers';

/**
 * GET /api/stream/maintenance
 * SSE stream for maintenance mode state changes (public)
 */
export async function GET(request: NextRequest) {
  const clientId = `maint-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const readableStream = new ReadableStream({
    start(controller) {
      // Add client to SSE manager
      maintenanceSSE.addClient(clientId, controller);

      // Send initial state
      const db = getDb();
      const setting = db
        .prepare('SELECT value FROM settings WHERE key = ?')
        .get('maintenance_mode') as { value: string } | undefined;

      const enabled = setting?.value === 'true';
      maintenanceSSE.sendToClient(clientId, 'MT_STATE_CHANGE', { enabled });

      console.log(`[SSE] Maintenance client ${clientId} connected`);
    },
    cancel() {
      // Client disconnected
      maintenanceSSE.removeClient(clientId);
      console.log(`[SSE] Maintenance client ${clientId} disconnected`);
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

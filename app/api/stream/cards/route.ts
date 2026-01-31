/**
 * SSE endpoint for card status updates
 * Streams real-time status changes for monitoring cards
 */

import { createSSEHeaders, createSSEStream } from '@/lib/sse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const stream = createSSEStream(
    (controller) => {
      const encoder = new TextEncoder();

      // Send initial connection message
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ message: 'Cards stream connected' })}\n\n`)
      );

      // Keep-alive ping every 30 seconds
      const keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`:keep-alive\n\n`));
        } catch (error) {
          clearInterval(keepAliveInterval);
        }
      }, 30000);

      // Store cleanup function
      (controller as any).cleanup = () => {
        clearInterval(keepAliveInterval);
      };
    },
    () => {
      // Cleanup on disconnect
      console.log('[SSE] Cards stream disconnected');
    }
  );

  return new Response(stream, {
    headers: createSSEHeaders(),
  });
}

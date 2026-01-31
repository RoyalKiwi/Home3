/**
 * Server-Sent Events (SSE) Connection Manager
 * Manages multiple SSE connections and broadcasts events to connected clients
 */

export interface SSEClient {
  id: string;
  encoder: TextEncoder;
  controller: ReadableStreamDefaultController;
}

export class SSEManager {
  private clients: Map<string, SSEClient> = new Map();

  /**
   * Add a new SSE client connection
   */
  addClient(id: string, controller: ReadableStreamDefaultController): void {
    const encoder = new TextEncoder();
    this.clients.set(id, { id, encoder, controller });
    console.log(`[SSE] Client connected: ${id} (Total: ${this.clients.size})`);
  }

  /**
   * Remove an SSE client connection
   */
  removeClient(id: string): void {
    this.clients.delete(id);
    console.log(`[SSE] Client disconnected: ${id} (Total: ${this.clients.size})`);
  }

  /**
   * Broadcast an event to all connected clients
   */
  broadcast(event: string, data: any): void {
    const message = this.formatSSEMessage(event, data);
    let sentCount = 0;

    this.clients.forEach((client) => {
      try {
        client.controller.enqueue(client.encoder.encode(message));
        sentCount++;
      } catch (error) {
        console.error(`[SSE] Failed to send to client ${client.id}:`, error);
        this.removeClient(client.id);
      }
    });

    if (sentCount > 0) {
      console.log(`[SSE] Broadcast "${event}" to ${sentCount} clients`);
    }
  }

  /**
   * Send an event to a specific client
   */
  sendToClient(clientId: string, event: string, data: any): void {
    const client = this.clients.get(clientId);
    if (!client) {
      console.warn(`[SSE] Client ${clientId} not found`);
      return;
    }

    try {
      const message = this.formatSSEMessage(event, data);
      client.controller.enqueue(client.encoder.encode(message));
    } catch (error) {
      console.error(`[SSE] Failed to send to client ${clientId}:`, error);
      this.removeClient(clientId);
    }
  }

  /**
   * Format data as SSE message
   */
  private formatSSEMessage(event: string, data: any): string {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  }

  /**
   * Send a keep-alive ping to all clients
   */
  sendKeepAlive(): void {
    const message = `:keep-alive\n\n`;

    this.clients.forEach((client) => {
      try {
        client.controller.enqueue(client.encoder.encode(message));
      } catch (error) {
        console.error(`[SSE] Keep-alive failed for ${client.id}:`, error);
        this.removeClient(client.id);
      }
    });
  }

  /**
   * Get number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    this.clients.forEach((client) => {
      try {
        client.controller.close();
      } catch (error) {
        console.error(`[SSE] Error closing client ${client.id}:`, error);
      }
    });
    this.clients.clear();
    console.log('[SSE] All connections closed');
  }
}

/**
 * Create a ReadableStream for SSE
 */
export function createSSEStream(
  onConnect: (controller: ReadableStreamDefaultController) => void,
  onDisconnect?: () => void
): ReadableStream {
  return new ReadableStream({
    start(controller) {
      onConnect(controller);
    },
    cancel() {
      if (onDisconnect) {
        onDisconnect();
      }
    },
  });
}

/**
 * Create SSE response headers
 */
export function createSSEHeaders(): Headers {
  return new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable buffering in nginx
  });
}

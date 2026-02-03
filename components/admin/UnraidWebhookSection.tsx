'use client';

import { useState, useEffect } from 'react';
import styles from './UnraidWebhookSection.module.css';

interface UnraidWebhookConfig {
  enabled: boolean;
  api_key: string | null;
  webhook_url: string;
  stats: {
    total_events: number;
    processed_events: number;
    unprocessed_events: number;
    events_last_24h: number;
  };
}

interface UnraidEvent {
  id: number;
  event_type: string;
  subject: string;
  description: string;
  importance: string;
  received_at: string;
  processed: boolean;
}

export default function UnraidWebhookSection() {
  const [config, setConfig] = useState<UnraidWebhookConfig | null>(null);
  const [recentEvents, setRecentEvents] = useState<UnraidEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const res = await fetch('/api/unraid-webhook');
      const data = await res.json();
      setConfig(data.data);
    } catch (error) {
      console.error('Failed to load Unraid webhook config:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleEnabled() {
    if (!config) return;

    try {
      const res = await fetch('/api/unraid-webhook', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !config.enabled }),
      });

      if (res.ok) {
        const data = await res.json();
        setConfig(data.data);
        alert(`Unraid webhook ${!config.enabled ? 'enabled' : 'disabled'}`);
      } else {
        alert('Failed to toggle webhook');
      }
    } catch (error) {
      alert('Failed to toggle webhook');
    }
  }

  async function handleGenerateApiKey() {
    if (!confirm('Generate a new API key? The old key will stop working.')) return;

    try {
      const res = await fetch('/api/unraid-webhook', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generate_api_key: true }),
      });

      if (res.ok) {
        const data = await res.json();
        setConfig(data.data);
        setShowApiKey(true);
        alert('New API key generated! Make sure to update it in your Unraid configuration.');
      } else {
        alert('Failed to generate API key');
      }
    } catch (error) {
      alert('Failed to generate API key');
    }
  }

  function copyToClipboard(text: string, type: 'url' | 'key') {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Unraid Webhook Receiver</h2>
        </div>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Unraid Webhook Receiver</h2>
        </div>
        <div className={styles.error}>Failed to load webhook configuration</div>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>Unraid Webhook Receiver</h2>
        <button
          className={`${styles.toggleBtn} ${config.enabled ? styles.toggleBtnActive : ''}`}
          onClick={handleToggleEnabled}
        >
          {config.enabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>

      <p className={styles.hint}>
        Configure Unraid to send webhook events to mirror its internal notifications.
      </p>

      <div className={styles.configGrid}>
        {/* Webhook URL */}
        <div className={styles.configCard}>
          <div className={styles.cardLabel}>Webhook URL</div>
          <div className={styles.urlBox}>
            <code className={styles.urlText}>{config.webhook_url}</code>
            <button
              className={styles.copyBtn}
              onClick={() => copyToClipboard(config.webhook_url, 'url')}
              title="Copy URL"
            >
              {copiedUrl ? '✓' : '📋'}
            </button>
          </div>
          <div className={styles.cardHint}>
            Use this URL in your Unraid notification agent configuration.
          </div>
        </div>

        {/* API Key */}
        <div className={styles.configCard}>
          <div className={styles.cardLabel}>API Key</div>
          {config.api_key ? (
            <>
              <div className={styles.urlBox}>
                <code className={styles.urlText}>
                  {showApiKey ? config.api_key : '••••••••••••••••••••••••'}
                </code>
                <button
                  className={styles.copyBtn}
                  onClick={() => setShowApiKey(!showApiKey)}
                  title={showApiKey ? 'Hide key' : 'Show key'}
                >
                  {showApiKey ? '🙈' : '👁️'}
                </button>
                <button
                  className={styles.copyBtn}
                  onClick={() => copyToClipboard(config.api_key!, 'key')}
                  title="Copy API key"
                >
                  {copiedKey ? '✓' : '📋'}
                </button>
              </div>
              <div className={styles.cardHint}>
                Use as Bearer token: <code>Authorization: Bearer {'{API_KEY}'}</code>
              </div>
            </>
          ) : (
            <>
              <div className={styles.noKey}>No API key generated</div>
              <div className={styles.cardHint}>Generate a key to enable authentication.</div>
            </>
          )}
          <button className={styles.btnGenerate} onClick={handleGenerateApiKey}>
            {config.api_key ? 'Regenerate Key' : 'Generate Key'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{config.stats.total_events}</div>
          <div className={styles.statLabel}>Total Events</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{config.stats.processed_events}</div>
          <div className={styles.statLabel}>Processed</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{config.stats.unprocessed_events}</div>
          <div className={styles.statLabel}>Unprocessed</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{config.stats.events_last_24h}</div>
          <div className={styles.statLabel}>Last 24 Hours</div>
        </div>
      </div>

      {/* Configuration Instructions */}
      <div className={styles.instructions}>
        <div className={styles.instructionsHeader}>Unraid Configuration Steps:</div>
        <ol className={styles.instructionsList}>
          <li>Go to Unraid <strong>Settings → Notifications</strong></li>
          <li>Click <strong>Add Notification Agent</strong></li>
          <li>Select <strong>Webhook</strong> as the agent type</li>
          <li>Paste the Webhook URL from above</li>
          <li>Add header: <code>Authorization: Bearer {'{YOUR_API_KEY}'}</code></li>
          <li>Configure which events to forward (array events, parity checks, etc.)</li>
          <li>Test the connection</li>
        </ol>
      </div>
    </div>
  );
}

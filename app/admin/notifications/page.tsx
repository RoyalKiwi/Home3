'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';

type Tab = 'rules' | 'webhooks' | 'maintenance';

type WebhookForm = {
  name: string;
  provider_type: 'discord' | 'telegram' | 'pushover';
  webhook_url: string;
};

type RuleForm = {
  webhook_id: number | null;
  name: string;
  metric_type: string;
  condition_type: 'threshold' | 'status_change';
  threshold_operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | null;
  threshold_value: number | null;
  from_status: string | null;
  to_status: string | null;
  severity: 'info' | 'warning' | 'critical';
  cooldown_minutes: number;
};

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('webhooks');
  const [rules, setRules] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);

  // Form states
  const [webhookForm, setWebhookForm] = useState<WebhookForm>({
    name: '',
    provider_type: 'discord',
    webhook_url: '',
  });

  const [ruleForm, setRuleForm] = useState<RuleForm>({
    webhook_id: null,
    name: '',
    metric_type: 'server_offline',
    condition_type: 'status_change',
    threshold_operator: null,
    threshold_value: null,
    from_status: 'online',
    to_status: 'offline',
    severity: 'warning',
    cooldown_minutes: 30,
  });

  // Load data on mount
  useEffect(() => {
    loadRules();
    loadWebhooks();
    loadMaintenanceMode();
  }, []);

  async function loadRules() {
    try {
      const res = await fetch('/api/notification-rules');
      const data = await res.json();
      setRules(data.data || []);
    } catch (error) {
      console.error('Failed to load rules:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadWebhooks() {
    try {
      const res = await fetch('/api/webhooks');
      const data = await res.json();
      setWebhooks(data.data || []);
    } catch (error) {
      console.error('Failed to load webhooks:', error);
    }
  }

  async function loadMaintenanceMode() {
    try {
      const res = await fetch('/api/settings/maintenance');
      const data = await res.json();
      setMaintenanceEnabled(data.data?.enabled || false);
    } catch (error) {
      console.error('Failed to load maintenance mode:', error);
    }
  }

  async function handleCreateWebhook(e: React.FormEvent) {
    e.preventDefault();

    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookForm),
      });

      if (res.ok) {
        await loadWebhooks();
        setShowWebhookModal(false);
        setWebhookForm({ name: '', provider_type: 'discord', webhook_url: '' });
        alert('Webhook created successfully!');
      } else {
        const data = await res.json();
        alert(`Failed to create webhook: ${data.error}`);
      }
    } catch (error) {
      alert('Failed to create webhook');
    }
  }

  async function handleCreateRule(e: React.FormEvent) {
    e.preventDefault();

    if (!ruleForm.webhook_id) {
      alert('Please select a webhook');
      return;
    }

    try {
      const payload: any = {
        webhook_id: ruleForm.webhook_id,
        name: ruleForm.name,
        metric_type: ruleForm.metric_type,
        condition_type: ruleForm.condition_type,
        severity: ruleForm.severity,
        cooldown_minutes: ruleForm.cooldown_minutes,
        target_type: 'all',
      };

      if (ruleForm.condition_type === 'threshold') {
        payload.threshold_operator = ruleForm.threshold_operator;
        payload.threshold_value = ruleForm.threshold_value;
      } else {
        payload.from_status = ruleForm.from_status;
        payload.to_status = ruleForm.to_status;
      }

      const res = await fetch('/api/notification-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await loadRules();
        setShowRuleModal(false);
        setRuleForm({
          webhook_id: null,
          name: '',
          metric_type: 'server_offline',
          condition_type: 'status_change',
          threshold_operator: null,
          threshold_value: null,
          from_status: 'online',
          to_status: 'offline',
          severity: 'warning',
          cooldown_minutes: 30,
        });
        alert('Rule created successfully!');
      } else {
        const data = await res.json();
        alert(`Failed to create rule: ${data.error}`);
      }
    } catch (error) {
      alert('Failed to create rule');
    }
  }

  async function handleDeleteWebhook(id: number, name: string) {
    if (!confirm(`Delete webhook "${name}"? This will also delete all associated rules.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadWebhooks();
        loadRules(); // Reload rules since they may have been cascaded
        alert('Webhook deleted successfully');
      } else {
        alert('Failed to delete webhook');
      }
    } catch (error) {
      alert('Failed to delete webhook');
    }
  }

  async function handleTestWebhook(id: number) {
    try {
      const res = await fetch(`/api/webhooks/${id}/test`, { method: 'POST' });
      const data = await res.json();
      alert(data.message || (data.success ? 'Test sent successfully!' : 'Test failed'));
    } catch (error) {
      alert('Failed to send test notification');
    }
  }

  async function handleDeleteRule(id: number, name: string) {
    if (!confirm(`Delete rule "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/notification-rules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadRules();
        alert('Rule deleted successfully');
      } else {
        alert('Failed to delete rule');
      }
    } catch (error) {
      alert('Failed to delete rule');
    }
  }

  async function handleTestRule(id: number) {
    try {
      const res = await fetch(`/api/notification-rules/${id}/test`, { method: 'POST' });
      const data = await res.json();
      alert(data.message || (data.success ? 'Test sent successfully!' : 'Test failed'));
    } catch (error) {
      alert('Failed to test rule');
    }
  }

  async function handleToggleMaintenanceMode() {
    try {
      const res = await fetch('/api/settings/maintenance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !maintenanceEnabled }),
      });

      if (res.ok) {
        setMaintenanceEnabled(!maintenanceEnabled);
      } else {
        alert('Failed to toggle maintenance mode');
      }
    } catch (error) {
      alert('Failed to toggle maintenance mode');
    }
  }

  function formatCondition(rule: any): string {
    if (rule.condition_type === 'threshold' && rule.threshold_operator && rule.threshold_value !== null) {
      const operators: Record<string, string> = { gt: '>', lt: '<', gte: '≥', lte: '≤', eq: '=' };
      const metricName = rule.metric_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      return `${metricName} ${operators[rule.threshold_operator] || rule.threshold_operator} ${rule.threshold_value}`;
    } else if (rule.condition_type === 'status_change') {
      const from = rule.from_status || 'any';
      const to = rule.to_status || 'any';
      return `Status: ${from} → ${to}`;
    }
    return rule.condition_type;
  }

  function formatSource(rule: any): string {
    if (rule.target_type === 'all') {
      return 'All Cards';
    } else if (rule.target_type === 'card') {
      return `Card #${rule.target_id}`;
    } else if (rule.target_type === 'integration') {
      return `Integration #${rule.target_id}`;
    }
    return 'Unknown';
  }

  function getProviderEmoji(provider: string): string {
    const emojis: Record<string, string> = {
      discord: '💬',
      telegram: '✈️',
      pushover: '📱',
    };
    return emojis[provider] || '🔔';
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Notifications</h1>
        <p className={styles.subtitle}>
          Configure webhook-based alerts and maintenance mode
        </p>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'rules' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          Rules ({rules.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'webhooks' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('webhooks')}
        >
          Webhooks ({webhooks.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'maintenance' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('maintenance')}
        >
          Maintenance
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.content}>
        {/* RULES TAB */}
        {activeTab === 'rules' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h2>Notification Rules</h2>
              <button
                className={styles.btnPrimary}
                onClick={() => setShowRuleModal(true)}
                disabled={webhooks.length === 0}
              >
                Add Rule
              </button>
            </div>
            <p className={styles.hint}>
              Rules define what to notify about. Each rule targets a webhook and specifies conditions.
            </p>

            {webhooks.length === 0 && (
              <div className={styles.hint} style={{ marginTop: '16px', color: '#F59E0B' }}>
                You must create at least one webhook before you can create rules.
              </div>
            )}

            {rules.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No notification rules configured.</p>
                <p className={styles.hint}>
                  Create rules to receive alerts about server status changes or threshold breaches.
                </p>
              </div>
            ) : (
              <div className={styles.table}>
                <div className={styles.tableHeader}>
                  <div>RULE NAME</div>
                  <div>SOURCE</div>
                  <div>CONDITION</div>
                  <div>WEBHOOK</div>
                  <div>STATUS</div>
                  <div>ACTIONS</div>
                </div>
                {rules.map(rule => (
                  <div key={rule.id} className={styles.tableRow}>
                    <div>
                      <strong>{rule.name}</strong>
                    </div>
                    <div>{formatSource(rule)}</div>
                    <div>{formatCondition(rule)}</div>
                    <div>
                      {getProviderEmoji(rule.webhook_provider_type)} {rule.webhook_name}
                    </div>
                    <div>
                      <span className={rule.is_active ? styles.statusActive : styles.statusInactive}>
                        {rule.is_active ? '● Active' : '○ Inactive'}
                      </span>
                    </div>
                    <div className={styles.col5}>
                      <button
                        className={styles.btnSmall}
                        onClick={() => handleTestRule(rule.id)}
                      >
                        Test
                      </button>
                      <button
                        className={styles.btnSmallDanger}
                        onClick={() => handleDeleteRule(rule.id, rule.name)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* WEBHOOKS TAB */}
        {activeTab === 'webhooks' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h2>Webhooks</h2>
              <button
                className={styles.btnPrimary}
                onClick={() => setShowWebhookModal(true)}
              >
                Add Webhook
              </button>
            </div>
            <p className={styles.hint}>
              Webhooks define where notifications are sent (Discord, Telegram, Pushover).
            </p>

            {webhooks.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No webhooks configured.</p>
                <p className={styles.hint}>
                  Add webhooks to start receiving notifications.
                </p>
              </div>
            ) : (
              <div className={styles.webhookGrid}>
                {webhooks.map(webhook => (
                  <div key={webhook.id} className={styles.webhookCard}>
                    <div className={styles.webhookHeader}>
                      <span className={styles.webhookIcon}>
                        {getProviderEmoji(webhook.provider_type)}
                      </span>
                      <span className={styles.webhookName}>{webhook.name}</span>
                      {webhook.is_active ? (
                        <span className={styles.statusDot}></span>
                      ) : (
                        <span className={styles.statusDotInactive}></span>
                      )}
                    </div>
                    <div className={styles.webhookProvider}>
                      {webhook.provider_type}
                    </div>
                    <div className={styles.webhookUrl}>
                      URL: {webhook.webhook_url_masked}
                    </div>
                    <div className={styles.webhookActions}>
                      <button
                        className={styles.btnPrimary}
                        onClick={() => handleTestWebhook(webhook.id)}
                      >
                        Test
                      </button>
                      <button
                        className={styles.btnDanger}
                        onClick={() => handleDeleteWebhook(webhook.id, webhook.name)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MAINTENANCE TAB */}
        {activeTab === 'maintenance' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h2>Maintenance Mode</h2>
              <p className={styles.hint}>
                When enabled, displays a global banner to all users indicating system maintenance.
              </p>
            </div>

            <div className={styles.maintenanceSection}>
              <div className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <strong>Enable Maintenance Banner</strong>
                  <p>Banner appears instantly via SSE to all connected users</p>
                </div>
                <button
                  className={`${styles.toggleBtn} ${maintenanceEnabled ? styles.toggleBtnActive : ''}`}
                  onClick={handleToggleMaintenanceMode}
                >
                  {maintenanceEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {maintenanceEnabled && (
                <div className={styles.maintenancePreview}>
                  <div className={styles.previewLabel}>Preview:</div>
                  <div className={styles.previewBanner}>
                    <span>⚠️</span>
                    <span>Maintenance Mode Active - System may be unavailable or experiencing updates</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* WEBHOOK MODAL */}
      {showWebhookModal && (
        <div className={styles.modalOverlay} onClick={() => setShowWebhookModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Add Webhook</h2>
              <button className={styles.modalClose} onClick={() => setShowWebhookModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateWebhook}>
              <div className={styles.formGroup}>
                <label>Name</label>
                <input
                  type="text"
                  placeholder="e.g., Discord - Ops Team"
                  value={webhookForm.name}
                  onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Provider</label>
                <select
                  value={webhookForm.provider_type}
                  onChange={(e) => setWebhookForm({ ...webhookForm, provider_type: e.target.value as any })}
                  required
                >
                  <option value="discord">Discord</option>
                  <option value="telegram">Telegram</option>
                  <option value="pushover">Pushover</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Webhook URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={webhookForm.webhook_url}
                  onChange={(e) => setWebhookForm({ ...webhookForm, webhook_url: e.target.value })}
                  required
                />
                <div className={styles.hint}>
                  {webhookForm.provider_type === 'discord' && 'Server Settings → Integrations → Webhooks'}
                  {webhookForm.provider_type === 'telegram' && 'Create bot via @BotFather, format: https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID>'}
                  {webhookForm.provider_type === 'pushover' && 'Format: token:user_key (e.g., abc123:xyz789)'}
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowWebhookModal(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  Create Webhook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RULE MODAL */}
      {showRuleModal && (
        <div className={styles.modalOverlay} onClick={() => setShowRuleModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Add Notification Rule</h2>
              <button className={styles.modalClose} onClick={() => setShowRuleModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateRule}>
              <div className={styles.formGroup}>
                <label>Rule Name</label>
                <input
                  type="text"
                  placeholder="e.g., Server Offline Alert"
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Webhook</label>
                <select
                  value={ruleForm.webhook_id || ''}
                  onChange={(e) => setRuleForm({ ...ruleForm, webhook_id: parseInt(e.target.value) })}
                  required
                >
                  <option value="">Select webhook...</option>
                  {webhooks.map(w => (
                    <option key={w.id} value={w.id}>
                      {getProviderEmoji(w.provider_type)} {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Metric Type</label>
                <select
                  value={ruleForm.metric_type}
                  onChange={(e) => setRuleForm({ ...ruleForm, metric_type: e.target.value })}
                  required
                >
                  <optgroup label="Server Status">
                    <option value="server_offline">Server Offline</option>
                    <option value="server_online">Server Online</option>
                    <option value="server_warning">Server Warning</option>
                  </optgroup>
                  <optgroup label="System Metrics">
                    <option value="cpu_temperature">CPU Temperature</option>
                    <option value="cpu_usage">CPU Usage</option>
                    <option value="memory_usage">Memory Usage</option>
                    <option value="disk_usage">Disk Usage</option>
                    <option value="drive_temperature">Drive Temperature</option>
                  </optgroup>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Condition Type</label>
                <select
                  value={ruleForm.condition_type}
                  onChange={(e) => setRuleForm({ ...ruleForm, condition_type: e.target.value as any })}
                  required
                >
                  <option value="status_change">Status Change</option>
                  <option value="threshold">Threshold</option>
                </select>
              </div>

              {ruleForm.condition_type === 'threshold' && (
                <>
                  <div className={styles.formGroup}>
                    <label>Operator</label>
                    <select
                      value={ruleForm.threshold_operator || ''}
                      onChange={(e) => setRuleForm({ ...ruleForm, threshold_operator: e.target.value as any })}
                      required
                    >
                      <option value="">Select operator...</option>
                      <option value="gt">Greater than (&gt;)</option>
                      <option value="gte">Greater than or equal (≥)</option>
                      <option value="lt">Less than (&lt;)</option>
                      <option value="lte">Less than or equal (≤)</option>
                      <option value="eq">Equal (=)</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Threshold Value</label>
                    <input
                      type="number"
                      placeholder="e.g., 80"
                      value={ruleForm.threshold_value || ''}
                      onChange={(e) => setRuleForm({ ...ruleForm, threshold_value: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                </>
              )}

              {ruleForm.condition_type === 'status_change' && (
                <>
                  <div className={styles.formGroup}>
                    <label>From Status</label>
                    <input
                      type="text"
                      placeholder="e.g., online"
                      value={ruleForm.from_status || ''}
                      onChange={(e) => setRuleForm({ ...ruleForm, from_status: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>To Status</label>
                    <input
                      type="text"
                      placeholder="e.g., offline"
                      value={ruleForm.to_status || ''}
                      onChange={(e) => setRuleForm({ ...ruleForm, to_status: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div className={styles.formGroup}>
                <label>Severity</label>
                <select
                  value={ruleForm.severity}
                  onChange={(e) => setRuleForm({ ...ruleForm, severity: e.target.value as any })}
                  required
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Cooldown (minutes)</label>
                <input
                  type="number"
                  min="1"
                  value={ruleForm.cooldown_minutes}
                  onChange={(e) => setRuleForm({ ...ruleForm, cooldown_minutes: parseInt(e.target.value) })}
                  required
                />
                <div className={styles.hint}>
                  Time between repeat notifications for the same condition
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowRuleModal(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

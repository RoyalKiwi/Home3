-- Migration 014: Simplify Notification Rules for SSE-Driven Architecture
-- Clean slate: Drop old notification tables and create simplified schema

BEGIN TRANSACTION;

-- Drop old notification tables
DROP TABLE IF EXISTS notification_history;
DROP TABLE IF EXISTS notification_rules;
DROP TABLE IF EXISTS metric_definitions;

-- Create new simplified notification_rules
CREATE TABLE notification_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,

  -- Integration targeting
  integration_id INTEGER NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,

  -- Metric reference (dynamic, no enum)
  metric_key TEXT NOT NULL,  -- 'cpu', 'memory', 'temperature', 'disk', etc.

  -- Condition
  operator TEXT NOT NULL CHECK(operator IN ('gt', 'lt', 'gte', 'lte', 'eq')),
  threshold REAL NOT NULL,

  -- Notification settings
  webhook_id INTEGER NOT NULL REFERENCES webhook_configs(id) ON DELETE CASCADE,
  template_id INTEGER REFERENCES notification_templates(id) ON DELETE SET NULL,
  severity TEXT DEFAULT 'warning' CHECK(severity IN ('info', 'warning', 'critical')),

  -- Rate limiting
  cooldown_minutes INTEGER DEFAULT 30,

  -- State
  is_active BOOLEAN DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_rules_integration ON notification_rules(integration_id);
CREATE INDEX idx_rules_active ON notification_rules(is_active);
CREATE INDEX idx_rules_metric ON notification_rules(metric_key);

-- Recreate notification_history for new system
CREATE TABLE notification_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_id INTEGER NOT NULL REFERENCES notification_rules(id) ON DELETE CASCADE,
  webhook_id INTEGER NOT NULL REFERENCES webhook_configs(id) ON DELETE CASCADE,

  status TEXT NOT NULL CHECK(status IN ('sent', 'failed')),

  -- Context
  integration_id INTEGER NOT NULL,
  metric_key TEXT NOT NULL,
  metric_value REAL,
  threshold REAL,

  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  sent_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_history_rule ON notification_history(rule_id);
CREATE INDEX idx_history_sent_at ON notification_history(sent_at);
CREATE INDEX idx_history_integration ON notification_history(integration_id);

COMMIT;

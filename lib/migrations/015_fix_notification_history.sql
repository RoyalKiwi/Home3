-- Migration 015: Fix notification_history table schema
-- Add missing columns for proper notification logging

-- Add missing columns to notification_history
ALTER TABLE notification_history ADD COLUMN alert_type TEXT;
ALTER TABLE notification_history ADD COLUMN title TEXT;
ALTER TABLE notification_history ADD COLUMN message TEXT;
ALTER TABLE notification_history ADD COLUMN severity TEXT CHECK(severity IN ('info', 'warning', 'critical'));
ALTER TABLE notification_history ADD COLUMN provider_type TEXT CHECK(provider_type IN ('discord', 'telegram', 'pushover'));
ALTER TABLE notification_history ADD COLUMN attempts INTEGER DEFAULT 1;
ALTER TABLE notification_history ADD COLUMN metadata TEXT; -- JSON string

-- Update existing rows with default values
UPDATE notification_history
SET
  alert_type = metric_key,
  title = 'Legacy Alert',
  message = 'Alert triggered for ' || metric_key,
  severity = 'warning',
  provider_type = 'discord',
  attempts = COALESCE(retry_count, 1),
  metadata = '{}'
WHERE alert_type IS NULL;

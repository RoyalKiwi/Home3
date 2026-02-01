'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import type { Integration } from '@/lib/types';

interface CardMapping {
  id: number;
  name: string;
  status_source_id: number | null;
  status_monitor_name: string | null;
}

interface Monitor {
  name: string;
  status: 'up' | 'down';
}

export default function ConfigurationPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status source configuration state
  const [statusSourceId, setStatusSourceId] = useState<number | null>(null);
  const [cards, setCards] = useState<CardMapping[]>([]);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [savingMappings, setSavingMappings] = useState(false);

  useEffect(() => {
    fetchIntegrations();
    fetchStatusSource();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch('/api/integrations');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch integrations');
      }

      setIntegrations(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatusSource = async () => {
    try {
      const res = await fetch('/api/settings/status-source');
      const data = await res.json();
      if (data.data && data.data.integration_id) {
        setStatusSourceId(data.data.integration_id);
        await loadStatusMappings(data.data.integration_id);
      }
    } catch (err) {
      console.error('Failed to fetch status source:', err);
    }
  };

  const loadStatusMappings = async (sourceId: number) => {
    setLoadingMappings(true);
    try {
      // Fetch cards and monitors in parallel
      const [cardsRes, monitorsRes] = await Promise.all([
        fetch('/api/cards/status-mappings'),
        fetch(`/api/integrations/${sourceId}/monitors`),
      ]);

      const cardsData = await cardsRes.json();
      const monitorsData = await monitorsRes.json();

      if (cardsRes.ok && cardsData.data) {
        const fetchedCards = cardsData.data as CardMapping[];

        if (monitorsRes.ok && monitorsData.data) {
          const fetchedMonitors = monitorsData.data as Monitor[];
          setMonitors(fetchedMonitors);

          // Auto-match cards to monitors
          const monitorsByName = new Map<string, string>();
          fetchedMonitors.forEach((m) => {
            monitorsByName.set(m.name.toLowerCase(), m.name);
          });

          const matchedCards = fetchedCards.map((card) => {
            // If card already has a mapping, keep it
            if (card.status_monitor_name) {
              return card;
            }

            // Otherwise, try auto-match
            const matchedName = monitorsByName.get(card.name.toLowerCase());
            return {
              ...card,
              status_monitor_name: matchedName || null,
            };
          });

          setCards(matchedCards);
        } else {
          setCards(fetchedCards);
        }
      }
    } catch (err) {
      console.error('Failed to load status mappings:', err);
    } finally {
      setLoadingMappings(false);
    }
  };

  const handleStatusSourceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSourceId = e.target.value ? parseInt(e.target.value, 10) : null;

    try {
      const res = await fetch('/api/settings/status-source', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integration_id: newSourceId }),
      });

      if (!res.ok) {
        throw new Error('Failed to update status source');
      }

      setStatusSourceId(newSourceId);

      if (newSourceId) {
        await loadStatusMappings(newSourceId);
      } else {
        setCards([]);
        setMonitors([]);
      }
    } catch (err) {
      alert(`Failed to update status source: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleCardMappingChange = (cardId: number, field: 'status_source_id' | 'status_monitor_name', value: string | null) => {
    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId
          ? { ...card, [field]: value === '' ? null : field === 'status_source_id' ? parseInt(value || '0', 10) : value }
          : card
      )
    );
  };

  const handleSaveMappings = async () => {
    setSavingMappings(true);
    try {
      const mappings = cards.map((card) => ({
        card_id: card.id,
        status_source_id: card.status_source_id,
        status_monitor_name: card.status_monitor_name,
      }));

      const res = await fetch('/api/cards/status-mappings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save mappings');
      }

      alert(`✅ Saved ${data.data.updated} card mappings`);
    } catch (err) {
      alert(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSavingMappings(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Configuration</h1>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Status Dot Configuration */}
      <div className={styles.statusConfig}>
        <h2>Status Dot Configuration</h2>
        <p className={styles.hint}>
          Configure which monitoring source powers the status dots on your homepage cards.
        </p>

        <div className={styles.formGroup}>
          <label htmlFor="statusSource">Global Status Source</label>
          <select
            id="statusSource"
            value={statusSourceId || ''}
            onChange={handleStatusSourceChange}
            className={styles.select}
          >
            <option value="">-- No Source (All Dots Orange) --</option>
            {integrations
              .filter((i) => ['uptime-kuma', 'unraid'].includes(i.service_type))
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.service_name} ({i.service_type})
                </option>
              ))}
          </select>
        </div>

        {statusSourceId && cards.length > 0 && (
          <div className={styles.mappingsSection}>
            <h3>Card to Monitor Mappings</h3>
            {loadingMappings ? (
              <p>Loading...</p>
            ) : (
              <>
                <div className={styles.mappingsTable}>
                  <div className={styles.tableHeader}>
                    <span>Card Name</span>
                    <span>Monitor/Container</span>
                  </div>
                  {cards.map((card) => (
                    <div key={card.id} className={styles.tableRow}>
                      <span className={styles.cardName}>{card.name}</span>
                      <select
                        value={card.status_monitor_name || ''}
                        onChange={(e) =>
                          handleCardMappingChange(card.id, 'status_monitor_name', e.target.value)
                        }
                        className={styles.select}
                      >
                        <option value="">-- Unlinked (Orange) --</option>
                        {monitors.map((monitor) => (
                          <option key={monitor.name} value={monitor.name}>
                            {monitor.name} ({monitor.status})
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleSaveMappings}
                  disabled={savingMappings}
                  className={styles.saveButton}
                >
                  {savingMappings ? 'Saving...' : 'Save Mappings'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

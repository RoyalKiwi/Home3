'use client';

import { useState, useEffect } from 'react';
import styles from './Modal.module.css';
import type { Subcategory, Category } from '@/lib/types';

interface SubcategoryModalProps {
  subcategory: Subcategory | null;
  categories: Category[];
  onClose: (refresh?: boolean) => void;
}

export default function SubcategoryModal({ subcategory, categories, onClose }: SubcategoryModalProps) {
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [showSeparator, setShowSeparator] = useState(true);
  const [adminOnly, setAdminOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (subcategory) {
      setCategoryId(String(subcategory.category_id));
      setName(subcategory.name);
      setShowSeparator(subcategory.show_separator);
      setAdminOnly(subcategory.admin_only);
    }
  }, [subcategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url = subcategory
        ? `/api/subcategories/${subcategory.id}`
        : '/api/subcategories';

      const method = subcategory ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: parseInt(categoryId),
          name,
          show_separator: showSeparator,
          admin_only: adminOnly,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save subcategory');
      }

      onClose(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={() => onClose()}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {subcategory ? 'Edit Subcategory' : 'Create Subcategory'}
          </h2>
          <button className={styles.closeButton} onClick={() => onClose()}>×</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label htmlFor="category" className={styles.label}>Category</label>
            <select
              id="category"
              className={styles.select}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              disabled={loading}
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>Subcategory Name</label>
            <input
              type="text"
              id="name"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter subcategory name"
              required
              maxLength={100}
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={showSeparator}
                onChange={(e) => setShowSeparator(e.target.checked)}
                disabled={loading}
              />
              Show separator line
            </label>
          </div>

          <div className={styles.field}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={adminOnly}
                onChange={(e) => setAdminOnly(e.target.checked)}
                disabled={loading}
              />
              Admin only (hidden from guests)
            </label>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={() => onClose()} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? 'Saving...' : subcategory ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import styles from './page.module.css';
import CategoryList from '@/components/admin/CategoryList';
import SubcategoryList from '@/components/admin/SubcategoryList';
import CardList from '@/components/admin/CardList';

type Tab = 'categories' | 'subcategories' | 'cards';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('categories');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard Management</h1>
        <p className={styles.subtitle}>Manage your homepage categories, subcategories, and cards</p>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'categories' ? styles.active : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          Categories
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'subcategories' ? styles.active : ''}`}
          onClick={() => setActiveTab('subcategories')}
        >
          Subcategories
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'cards' ? styles.active : ''}`}
          onClick={() => setActiveTab('cards')}
        >
          Cards
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'categories' && <CategoryList />}
        {activeTab === 'subcategories' && <SubcategoryList />}
        {activeTab === 'cards' && <CardList />}
      </div>
    </div>
  );
}

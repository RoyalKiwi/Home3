import fs from 'fs';
import path from 'path';
import { getDb } from '@/lib/db';

const DATA_PATH = process.env.DATA_PATH || './data';

/**
 * Clean up icon file when a card is deleted
 * Only deletes if no other cards are using the same icon
 */
export function cleanupCardIcon(iconPath: string | null): void {
  if (!iconPath) return;

  try {
    console.log(`🧹 Checking if icon can be deleted: ${iconPath}`);

    const db = getDb();

    // Check if any other cards are using this icon
    const otherCards = db
      .prepare('SELECT COUNT(*) as count FROM cards WHERE icon_url = ?')
      .get(iconPath) as { count: number };

    if (otherCards.count > 0) {
      console.log(`⚠️  Icon still in use by ${otherCards.count} card(s), skipping deletion`);
      return;
    }

    // Icon is not used by any cards, safe to delete
    const fullPath = path.join(DATA_PATH, iconPath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`✅ Deleted unused icon: ${fullPath}`);
    } else {
      console.log(`ℹ️  Icon file not found: ${fullPath}`);
    }
  } catch (error) {
    console.error('Asset cleanup error:', error);
    // Don't throw - cleanup failure shouldn't block card deletion
  }
}

/**
 * Clean up all orphaned icons in cache and uploads directories
 * Call this periodically or as a maintenance task
 */
export function cleanupOrphanedIcons(): { removed: number; errors: number } {
  console.log('🧹 Starting orphaned icon cleanup...');

  const db = getDb();
  const stats = { removed: 0, errors: 0 };

  // Get all icon paths currently in use
  const usedIcons = db
    .prepare('SELECT DISTINCT icon_url FROM cards WHERE icon_url IS NOT NULL')
    .all() as { icon_url: string }[];

  const usedIconPaths = new Set(usedIcons.map((row) => row.icon_url));

  // Clean cache directory
  const cachePath = path.join(DATA_PATH, 'cache');
  if (fs.existsSync(cachePath)) {
    const cacheFiles = fs.readdirSync(cachePath);
    for (const file of cacheFiles) {
      const iconPath = `/cache/${file}`;
      if (!usedIconPaths.has(iconPath)) {
        try {
          fs.unlinkSync(path.join(cachePath, file));
          stats.removed++;
          console.log(`✅ Removed orphaned cache icon: ${file}`);
        } catch (error) {
          console.error(`❌ Failed to remove ${file}:`, error);
          stats.errors++;
        }
      }
    }
  }

  // Clean uploads directory
  const uploadsPath = path.join(DATA_PATH, 'uploads');
  if (fs.existsSync(uploadsPath)) {
    const uploadFiles = fs.readdirSync(uploadsPath);
    for (const file of uploadFiles) {
      const iconPath = `/uploads/${file}`;
      if (!usedIconPaths.has(iconPath)) {
        try {
          fs.unlinkSync(path.join(uploadsPath, file));
          stats.removed++;
          console.log(`✅ Removed orphaned upload icon: ${file}`);
        } catch (error) {
          console.error(`❌ Failed to remove ${file}:`, error);
          stats.errors++;
        }
      }
    }
  }

  console.log(`🎉 Cleanup complete: ${stats.removed} removed, ${stats.errors} errors`);
  return stats;
}

/**
 * Get cache size statistics
 */
export function getCacheStats(): { totalFiles: number; totalSize: number; cacheFiles: number; uploadFiles: number } {
  const stats = {
    totalFiles: 0,
    totalSize: 0,
    cacheFiles: 0,
    uploadFiles: 0,
  };

  // Count cache directory
  const cachePath = path.join(DATA_PATH, 'cache');
  if (fs.existsSync(cachePath)) {
    const files = fs.readdirSync(cachePath);
    stats.cacheFiles = files.length;
    stats.totalFiles += files.length;

    for (const file of files) {
      try {
        const filePath = path.join(cachePath, file);
        const stat = fs.statSync(filePath);
        stats.totalSize += stat.size;
      } catch (error) {
        // Ignore errors
      }
    }
  }

  // Count uploads directory
  const uploadsPath = path.join(DATA_PATH, 'uploads');
  if (fs.existsSync(uploadsPath)) {
    const files = fs.readdirSync(uploadsPath);
    stats.uploadFiles = files.length;
    stats.totalFiles += files.length;

    for (const file of files) {
      try {
        const filePath = path.join(uploadsPath, file);
        const stat = fs.statSync(filePath);
        stats.totalSize += stat.size;
      } catch (error) {
        // Ignore errors
      }
    }
  }

  return stats;
}

import { openDB } from 'idb';

const DB_NAME = 'video-cache-db';
const STORE_NAME = 'videos';

export async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

export async function cacheVideo(url, blob) {
  console.log(`💾 Caching video locally: ${url}`);
  const db = await getDB();
  await db.put(STORE_NAME, blob, url);
}

export async function getCachedVideo(url) {
  const db = await getDB();
  return db.get(STORE_NAME, url);
}

export async function deleteCachedVideo(url) {
  const db = await getDB();
  await db.delete(STORE_NAME, url);
}

export async function getAllCachedUrls() {
  const db = await getDB();
  return db.getAllKeys(STORE_NAME);
}

export async function clearAllVideoCache() {
  const db = await getDB();
  await db.clear(STORE_NAME);
}

export async function cleanupOrphanedVideos(activeUrls) {
  try {
    const cachedUrls = await getAllCachedUrls();
    const activeUrlsSet = new Set(activeUrls);
    for (const url of cachedUrls) {
      if (!activeUrlsSet.has(url)) {
        await deleteCachedVideo(url);
        console.log(`🧹 Deleted orphaned cached video: ${url}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up orphaned videos:', error);
  }
}

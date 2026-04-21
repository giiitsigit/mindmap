import { useEffect, useState } from 'react';
import { auth, db as fdb } from './firebase';
import { db as ldb } from './localDb';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { MindMap } from './types';

export function useSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  // Sync logic
  useEffect(() => {
    if (isOnline && user) {
      syncData();
    }
  }, [isOnline, user]);

  async function syncData() {
    if (!user) return;

    try {
      // 1. Push local dirty changes to cloud
      const dirtyMaps = await ldb.mindmaps.where('isDirty').equals(1).toArray();
      const batch = writeBatch(fdb);
      
      for (const map of dirtyMaps) {
        const mapDoc = doc(fdb, 'mindmaps', map.id);
        const { isDirty, ...uploadData } = map;
        batch.set(mapDoc, { ...uploadData, ownerId: user.uid });
      }
      
      if (dirtyMaps.length > 0) {
        await batch.commit();
        await ldb.mindmaps.where('id').anyOf(dirtyMaps.map(m => m.id)).modify({ isDirty: 0 });
      }

      // 2. Fetch cloud changes (simplified: just pull everything for now or newer than max local)
      const q = query(collection(fdb, 'mindmaps'), where('ownerId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      for (const docSnapshot of querySnapshot.docs) {
        const cloudMap = docSnapshot.data() as MindMap;
        const localVersion = await ldb.mindmaps.get(cloudMap.id);
        
        if (!localVersion || cloudMap.updatedAt > localVersion.updatedAt) {
          await ldb.mindmaps.put({ ...cloudMap, isDirty: 0 });
        }
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  return { isOnline, user };
}

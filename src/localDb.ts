import Dexie, { Table } from 'dexie';
import { MindMap } from './types';

export class LocalDB extends Dexie {
  mindmaps!: Table<MindMap>;

  constructor() {
    super('MindSyncDB');
    this.version(1).stores({
      mindmaps: 'id, ownerId, updatedAt, isDirty'
    });
  }
}

export const db = new LocalDB();

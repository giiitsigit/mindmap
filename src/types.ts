import { Node, Edge } from 'reactflow';

export type Theme = 'modern' | 'cyberpunk' | 'organic' | 'brutalist' | 'minimal';

export interface MindMapData {
  nodes: Node[];
  edges: Edge[];
}

export interface MindMap {
  id: string;
  title: string;
  theme: Theme;
  data: MindMapData;
  updatedAt: number;
  ownerId: string;
  isDirty?: 0 | 1; 
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
}

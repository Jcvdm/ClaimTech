// Minimal repository interfaces for development without auth
export type Work = {
  id: string;
  type: string; // e.g., 'estimate', 'inspection', 'approval', 'photos'
  title: string;
  updated_at: string; // ISO string
};

export interface Repo {
  listPendingWork(): Promise<Work[]>;
  listPendingByType(type: string): Promise<Work[]>;
}


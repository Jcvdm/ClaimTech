import type { Repo, Work } from './repo';

const now = new Date();
function daysAgo(n: number) {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const sample: Work[] = [
  { id: 'r1', type: 'requests', title: 'New report: Collision on N1', updated_at: daysAgo(0) },
  { id: 'r2', type: 'requests', title: 'New report: Hail damage, PTA', updated_at: daysAgo(2) },
  { id: 'i1', type: 'inspections', title: 'On-site inspection: VIN 5YJ3E1EA7', updated_at: daysAgo(1) },
  { id: 'i2', type: 'inspections', title: 'Follow-up inspection: suspension noise', updated_at: daysAgo(3) },
  { id: 'f1', type: 'frc', title: 'Final costing: Claim #A123', updated_at: daysAgo(1) },
  { id: 'a1', type: 'additionals', title: 'Additional: Add paint blend to panel', updated_at: daysAgo(4) }
];

export const repo: Repo = {
  async listPendingWork() {
    // Simulate async
    await new Promise((r) => setTimeout(r, 20));
    // Most recent first
    return [...sample].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  },
  async listPendingByType(type: string) {
    const all = await this.listPendingWork();
    return all.filter((w) => w.type === type);
  }
};


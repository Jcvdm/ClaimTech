import type { PageServerLoad } from './$types';
import type { Work } from '$lib/repo';
import { repo } from '$lib/repo.mock';

export const load: PageServerLoad = async () => {
  const items = await repo.listPendingWork();

  const byType = new Map<string, Work[]>();
  for (const w of items) {
    if (!byType.has(w.type)) byType.set(w.type, []);
    byType.get(w.type)!.push(w);
  }

  const groups = Array.from(byType.entries()).map(([type, items]) => ({
    type,
    items
  }));

  return { groups };
};


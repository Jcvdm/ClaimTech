import type { PageServerLoad } from './$types';
import { repo } from '$lib/repo.mock';

export const load: PageServerLoad = async ({ params }) => {
  const type = params.type;
  const items = await repo.listPendingByType(type);
  return { type, items };
};


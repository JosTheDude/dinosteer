export interface PterodactylPagination {
  total: number;
  count: number;
  per_page: number;
  current_page: number;
  total_pages: number;
}

export interface PterodactylListResponse<T> {
  object: "list";
  data: T[];
  meta?: { pagination: PterodactylPagination };
}

export async function* paginate<T>(
  fetchPage: (page: number) => Promise<PterodactylListResponse<T>>
): AsyncGenerator<T, void, void> {
  let page = 1;
  for (;;) {
    const response = await fetchPage(page);
    for (const item of response.data) yield item;

    const pagination = response.meta?.pagination;
    if (!pagination || pagination.current_page >= pagination.total_pages) return;
    page = pagination.current_page + 1;
  }
}

export async function collectAll<T>(
  fetchPage: (page: number) => Promise<PterodactylListResponse<T>>
): Promise<T[]> {
  const items: T[] = [];
  for await (const item of paginate(fetchPage)) items.push(item);
  return items;
}

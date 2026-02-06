const DEFAULT_BASE_URL = "https://app.pennylane.com/api/external/v2";

type QueryValue = string | number | boolean | null | undefined;

export type PennylaneListResponse<T> = {
  items: T[];
  next_cursor?: string | null;
  has_more?: boolean;
};

type FetchOptions = {
  token?: string;
};

const getAccessToken = (override?: string) => {
  const token = override?.trim() || process.env.PENNYLANE_ACCESS_TOKEN;
  if (!token) {
    throw new Error("PENNYLANE_ACCESS_TOKEN manquant");
  }
  return token;
};

const getBaseUrl = () => {
  const baseUrl = process.env.PENNYLANE_BASE_URL ?? DEFAULT_BASE_URL;
  return baseUrl.replace(/\/+$/, "");
};

const toSearchParams = (query: Record<string, unknown>) => {
  const params = new URLSearchParams();

  const appendParam = (key: string, value: unknown) => {
    if (value === undefined || value === null) {
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        appendParam(key, item);
      }
      return;
    }

    if (typeof value === "object") {
      for (const [childKey, childValue] of Object.entries(value)) {
        appendParam(`${key}[${childKey}]`, childValue);
      }
      return;
    }

    params.append(key, String(value as QueryValue));
  };

  for (const [key, value] of Object.entries(query)) {
    appendParam(key, value);
  }

  return params;
};

export const fetchPennylane = async (
  path: string,
  query: Record<string, unknown>,
  options?: FetchOptions,
) => {
  const baseUrl = getBaseUrl();
  const url = new URL(path.replace(/^\/+/, ""), `${baseUrl}/`);
  const params = toSearchParams(query);
  const paramsString = params.toString();

  if (paramsString) {
    url.search = paramsString;
  }

  const token = getAccessToken(options?.token);

  return fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
};

const parsePennylaneError = (rawText: string, status: number) => {
  if (!rawText) {
    return `Erreur Pennylane (HTTP ${status})`;
  }

  try {
    const parsed = JSON.parse(rawText) as {
      error?: string;
      message?: string;
    };
    if (parsed?.error) {
      return parsed.error;
    }
    if (parsed?.message) {
      return parsed.message;
    }
  } catch {
    // ignore JSON parsing errors
  }

  return rawText;
};

export const fetchPennylaneListPage = async <T>(
  path: string,
  query: Record<string, unknown>,
  options?: FetchOptions,
): Promise<PennylaneListResponse<T>> => {
  const response = await fetchPennylane(path, query, options);
  const rawText = await response.text();

  if (!response.ok) {
    const message = parsePennylaneError(rawText, response.status);
    throw new Error(`Erreur Pennylane: ${message}`);
  }

  if (!rawText) {
    return { items: [], next_cursor: null, has_more: false };
  }

  const parsed = JSON.parse(rawText) as PennylaneListResponse<T>;
  const items = Array.isArray(parsed.items) ? parsed.items : [];

  return {
    ...parsed,
    items,
  };
};

export const fetchPennylaneAllPages = async <T>(
  path: string,
  query: Record<string, unknown>,
  onPage: (items: T[], page: PennylaneListResponse<T>) => Promise<void> | void,
  options?: FetchOptions,
) => {
  let cursor: string | undefined;
  const seenCursors = new Set<string>();
  let pageCount = 0;
  let totalItems = 0;

  while (true) {
    const pageQuery = {
      ...query,
      cursor,
    };

    const page = await fetchPennylaneListPage<T>(path, pageQuery, options);
    pageCount += 1;
    totalItems += page.items.length;

    await onPage(page.items, page);

    const nextCursor = page.next_cursor ?? null;
    if (!nextCursor || page.has_more === false) {
      break;
    }
    if (seenCursors.has(nextCursor)) {
      throw new Error("Boucle de pagination detectee");
    }
    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }

  return { pageCount, totalItems };
};

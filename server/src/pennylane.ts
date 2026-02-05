const DEFAULT_BASE_URL = "https://app.pennylane.com/api/external/v2";

type QueryValue = string | number | boolean | null | undefined;

const getAccessToken = () => {
  const token = process.env.PENNYLANE_ACCESS_TOKEN;
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

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null) {
          continue;
        }
        if (typeof item === "object") {
          continue;
        }
        params.append(key, String(item as QueryValue));
      }
      continue;
    }

    if (typeof value === "object") {
      continue;
    }

    params.append(key, String(value as QueryValue));
  }

  return params;
};

export const fetchPennylane = async (
  path: string,
  query: Record<string, unknown>,
) => {
  const baseUrl = getBaseUrl();
  const url = new URL(path.replace(/^\/+/, ""), `${baseUrl}/`);
  const params = toSearchParams(query);
  const paramsString = params.toString();

  if (paramsString) {
    url.search = paramsString;
  }

  const token = getAccessToken();

  return fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
};

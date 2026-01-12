const AIRLABS_BASE_URL = import.meta.env.AIRLABS_BASE_URL;
const CELESTRAK_BASE_URL = import.meta.env.CELESTRAK_BASE_URL;

export const apiConfig = {
  airLabs: {
    apiKey: import.meta.env.VITE_AIRLABS_API_KEY || "",
    baseUrl: AIRLABS_BASE_URL,
  },
  celestrak: {
    baseUrl: CELESTRAK_BASE_URL,
  },
  mapTiler: {
    apiKey: import.meta.env.VITE_MAPTILER_API_KEY || "",
  },
};

// ============================================
// FETCH WITH TIMEOUT
// ============================================

interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number;
}

export const fetchWithTimeout = async (
  url: string,
  options: FetchWithTimeoutOptions = {},
  // options: RequestInit = {},
  timeout = 10000
): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

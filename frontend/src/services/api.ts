const AIRLABS_BASE_URL = 'https://airlabs.co/api/v9';
const CELESTRAK_BASE_URL = 'https://celestrak.org/NORAD/elements/gp.php';

export const apiConfig = {
  airLabs: {
    apiKey: import.meta.env.VITE_AIRLABS_API_KEY || '',
    baseUrl: AIRLABS_BASE_URL,
  },
  celestrak: {
    baseUrl: CELESTRAK_BASE_URL,
  },
  mapTiler: {
    apiKey: import.meta.env.VITE_MAPTILER_API_KEY || '',
  },
};

export const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
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
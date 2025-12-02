const AIRLABS_BASE_URL = 'https://airlabs.co/api/v9';
const LEOLABS_BASE_URL = 'https://api.leolabs.space/v1'; 

export const apiConfig = {
  airLabs: {
    apiKey: import.meta.env.VITE_AIRLABS_API_KEY || '',
    baseUrl: AIRLABS_BASE_URL,
  },
  leoLabs: {
    apiKey: import.meta.env.VITE_LEOLABS_API_KEY || '',
    baseUrl: LEOLABS_BASE_URL,
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
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

async function handleResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  let parsed: any;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Invalid JSON response: ${text}`);
  }

  if (!response.ok) {
    throw new Error(parsed?.detail || `Request failed with status ${response.status}`);
  }

  return parsed as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return handleResponse<T>(response);
}

export async function apiPost<TResponse, TBody>(path: string, body: TBody): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return handleResponse<TResponse>(response);
}

export async function apiPatch<TResponse, TBody>(path: string, body: TBody): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return handleResponse<TResponse>(response);
}
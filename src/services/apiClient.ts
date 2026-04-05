// src/services/apiClient.ts

// Change this to your ngrok URL or local IP when testing on a physical phone
// e.g., 'https://1a2b-3c4d.ngrok-free.app/api'
const rawBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL || process.env.NGROK_URL || "";

const trimmedBaseUrl = rawBaseUrl.endsWith("/")
  ? rawBaseUrl.slice(0, -1)
  : rawBaseUrl;

export const API_BASE_URL = trimmedBaseUrl.endsWith("/api")
  ? trimmedBaseUrl
  : `${trimmedBaseUrl}/api`;

export const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "An API error occurred");
  }
  return response.json();
};

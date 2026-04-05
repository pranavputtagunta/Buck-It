// src/services/apiClient.ts

// Change this to your ngrok URL or local IP when testing on a physical phone
// e.g., 'https://1a2b-3c4d.ngrok-free.app/api'
export const API_BASE_URL = process.env.NGROK_URL;

export const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "An API error occurred");
  }
  return response.json();
};

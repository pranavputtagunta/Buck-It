// src/services/bucketService.ts
import { API_BASE_URL, handleApiError } from "./apiClient";

export const bucketService = {
  async getGlobalFeed() {
    const response = await fetch(`${API_BASE_URL}/buckets/feed/global`);
    const data = await handleApiError(response);
    return data.data; // Returns the array of buckets
  },

  async generateOnboardingGoals(userId: string, userAnswers: string) {
    const response = await fetch(`${API_BASE_URL}/onboard/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, user_answers: userAnswers }),
    });

    const data = await handleApiError(response);
    return data.goals;
  },
};

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

  async saveOnboardingGoals(
    userId: string,
    acceptedGoals: { title: string; deadline?: string | null }[],
    customGoals: { title: string; deadline?: string | null }[],
  ) {
    const response = await fetch(`${API_BASE_URL}/bucket-list/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        accepted_goals: acceptedGoals,
        custom_goals: customGoals,
      }),
    });

    const data = await handleApiError(response);
    return data.data;
  },

  async planBucketWithAgent(userId: string, requestText: string) {
    const response = await fetch(`${API_BASE_URL}/concierge/plan-bucket`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        request_text: requestText,
      }),
    });

    const data = await handleApiError(response);
    return data.data; // This returns the perfectly formatted PlannedBucketCard!
  },

  async getDiscoverFeed(userId: string) {
    const response = await fetch(`${API_BASE_URL}/buckets/discover/${userId}`);
    const data = await handleApiError(response);
    return data.data; // Returns the array of 5 Discover items
  },

  async getDiscoverPage(userId: string) {
    const response = await fetch(
      `${API_BASE_URL}/buckets/discover-page/${userId}`,
    );
    const data = await handleApiError(response);
    return data.data;
  },

  async acceptDiscoverBucket(payload: {
    actor_id: string;
    title: string;
    category: string;
    description?: string;
    event_time: string;
    visibility?: string;
    bucket_list_item_id?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/buckets/accept-discover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await handleApiError(response);
    return data.data;
  },

  async getUserBucketsGrouped(userId: string) {
    const response = await fetch(
      `${API_BASE_URL}/buckets/user/${userId}/grouped`,
    );
    const data = await handleApiError(response);
    return data.data;
  },
};

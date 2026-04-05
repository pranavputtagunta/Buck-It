import { apiPost } from './api';
import type { OnboardRequest, OnboardResponse } from '../types/onboarding';

export async function onboardUser(payload: OnboardRequest): Promise<OnboardResponse> {
  return apiPost<OnboardResponse, OnboardRequest>(`/api/onboard/`, payload);
}
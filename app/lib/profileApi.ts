import { apiPost } from './api';

export type ProfileCreateRequest = {
  id: string;
  username: string;
  personality: string;
  hobbies: string[];
  location?: string;
  bucket_list: {
    title: string;
    category: string;
    deadline?: string;
  }[];
  onboarding_data: Record<string, any>;
};

export type ProfileCreateResponse = {
  status: 'success';
  data?: any[];
  user_data?: any[];
  bucket_data?: any[];
};

export async function createOrUpdateProfile(
  payload: ProfileCreateRequest
): Promise<ProfileCreateResponse> {
  return apiPost<ProfileCreateResponse, ProfileCreateRequest>(
    '/api/users/profile',
    payload
  );
}
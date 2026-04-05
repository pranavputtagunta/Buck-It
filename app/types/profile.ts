import type { BucketDraftItem } from './onboarding';

export interface ProfileCreateRequest {
  id: string;
  username: string;
  personality: string;
  hobbies: string[];
  bucket_list: BucketDraftItem[];
  onboarding_data: Record<string, any>;
}

export interface ProfileCreateResponse {
  status: 'success';
  data: Array<{
    id: string;
    username: string;
    personality: string;
    hobbies: string[];
    bucket_list: BucketDraftItem[];
    onboarding_data: Record<string, any>;
  }>;
}
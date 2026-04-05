export interface BucketGoal {
  title: string;
  deadline: string; // YYYY-MM-DD
}

export interface OnboardRequest {
  user_id: string;
  user_answers: string;
}

export interface OnboardResponse {
  status: 'success';
  goals: BucketGoal[];
}

export interface BucketDraftItem {
  title: string;
  category: string;
  deadline?: string;
}

export type BucketListSource = 'manual' | 'ai' | 'mixed';

export interface AggregateOnboardingData {
  personality: string;
  hobbies: string[];
  bucketListDraft: BucketDraftItem[];
  bucketListSource: BucketListSource;
}
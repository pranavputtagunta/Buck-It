export interface ApiSuccessResponse<T> {
  status: 'success';
  data: T;
}

export interface ApiErrorResponse {
  detail: string;
}

export interface UserRecord {
  id: string;
  display_name: string;
  badges: string[];
}

export interface BadgeUpdateRequest {
  badges: string[];
}

export interface UserCreateRequest {
  id: string;
  display_name: string;
}

export interface GetUserResponse {
  status: 'success';
  data: UserRecord[];
}

export interface UpdateUserBadgesResponse {
  status: 'success';
  data: UserRecord[];
}

export interface CreateUserResponse {
  status: 'success';
  data: UserRecord[];
}

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
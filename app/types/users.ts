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
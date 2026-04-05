import { apiGet, apiPatch, apiPost } from './api';
import type {
  BadgeUpdateRequest,
  CreateUserResponse,
  GetUserResponse,
  UpdateUserBadgesResponse,
  UserCreateRequest,
} from '../types/users';

export async function getUser(userId: string): Promise<GetUserResponse> {
  return apiGet<GetUserResponse>(`/api/users/${userId}`);
}

export async function updateUserBadges(
  userId: string,
  payload: BadgeUpdateRequest
): Promise<UpdateUserBadgesResponse> {
  return apiPatch<UpdateUserBadgesResponse, BadgeUpdateRequest>(
    `/api/users/${userId}/badges`,
    payload
  );
}

export async function createUser(payload: UserCreateRequest): Promise<CreateUserResponse> {
  return apiPost<CreateUserResponse, UserCreateRequest>(`/api/users/`, payload);
}
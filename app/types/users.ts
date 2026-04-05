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

export interface AvailabilityUpdateRequest {
  user_id: string;
  available_slots: string[];
}

export interface UpdateAvailabilityResponse {
  status: 'success';
  data: any; 
}

export const updateUserAvailability = async (
  request: AvailabilityUpdateRequest
): Promise<UpdateAvailabilityResponse> => {
  const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!apiBase) throw new Error('EXPO_PUBLIC_API_BASE_URL is not defined');

  const response = await fetch(`${apiBase}/api/users/availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update availability');
  }

  return response.json();
};
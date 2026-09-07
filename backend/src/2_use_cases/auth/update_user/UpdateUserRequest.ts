// src/2_use_cases/auth/update_user/UpdateUserRequest.ts
export interface UpdateUserRequest {
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string | null;
}

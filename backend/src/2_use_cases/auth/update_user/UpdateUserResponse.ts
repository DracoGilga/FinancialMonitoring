// src/2_use_cases/auth/update_user/UpdateUserResponse.ts
export interface UpdateUserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
}

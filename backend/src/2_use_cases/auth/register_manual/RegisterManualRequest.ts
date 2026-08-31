// src/2_use_cases/auth/register_manual/RegisterManualRequest.ts
export interface RegisterManualRequest {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
}

// src/2_use_cases/auth/register_manual/RegisterManualResponse.ts
export interface RegisterManualResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
}

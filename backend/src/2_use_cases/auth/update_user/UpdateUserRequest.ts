export interface UpdateUserRequest {
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string | null;
}

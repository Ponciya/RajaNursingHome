export type UserRole = "ADMIN" | "BILLING_STAFF";

export type AuthUser = {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
};

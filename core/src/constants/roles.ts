export const Role = {
  MEMBER: "member",
  ADMIN: "admin",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

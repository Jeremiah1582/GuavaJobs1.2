// src/lib/dev-user.ts — client-safe local user (auth disabled)

export const DEV_USER_ID = "local-dev-user";

export type AppUser = {
  id: string;
  name: string;
  email: string;
};

export const DEV_USER: AppUser = {
  id: DEV_USER_ID,
  name: "Local User",
  email: "dev@localhost",
};

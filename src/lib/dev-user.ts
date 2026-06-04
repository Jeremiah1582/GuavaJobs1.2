// src/lib/dev-user.ts — client-safe local user (auth disabled)

/** Stable UUID for interim dev-user auth until Supabase sign-in (Wave 1). */
export const DEV_USER_ID = "00000000-0000-4000-8000-000000000001";

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

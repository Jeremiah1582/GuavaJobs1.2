/** Session user shape for DB sync (Wave 1 adds Supabase JWT). */

export type SessionUser = {
  id: string;
  email: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateSessionUser(input: {
  id: string;
  email: string;
}): SessionUser {
  const id = input.id.trim();
  const email = input.email.trim().toLowerCase();

  if (!UUID_RE.test(id)) {
    throw new Error("Invalid user id");
  }

  if (!email || !email.includes("@")) {
    throw new Error("Invalid email");
  }

  return { id, email };
}

export function parseSessionUser(payload: unknown): SessionUser | null {
  if (
    payload &&
    typeof payload === "object" &&
    "id" in payload &&
    "email" in payload &&
    typeof (payload as SessionUser).id === "string" &&
    typeof (payload as SessionUser).email === "string"
  ) {
    try {
      return validateSessionUser(payload as SessionUser);
    } catch {
      return null;
    }
  }
  return null;
}

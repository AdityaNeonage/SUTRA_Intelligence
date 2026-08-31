import type { AuthSession } from "../types/api";

const SESSION_KEY = "sutra.session.v1";

export function readSession(): AuthSession | null {
  try {
    const serialized = sessionStorage.getItem(SESSION_KEY);
    if (!serialized) return null;
    const parsed: unknown = JSON.parse(serialized);
    if (typeof parsed === "object" && parsed !== null && "access_token" in parsed && "user" in parsed) {
      return parsed as AuthSession;
    }
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
  }
  return null;
}

export function writeSession(session: AuthSession) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

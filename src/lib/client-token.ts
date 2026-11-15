/**
 * Returns a persistent anonymous client token stored in localStorage
 * to support unique confirmations and flags without requiring account signup.
 */
export function getOrCreateClientToken(): string {
  if (typeof window === "undefined") {
    return "server-render-token";
  }

  const STORAGE_KEY = "ns_client_device_token";
  let token = localStorage.getItem(STORAGE_KEY);

  if (!token) {
    token = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(STORAGE_KEY, token);
  }

  return token;
}

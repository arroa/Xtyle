/**
 * Login sin OTP (cookie sx_dev_session).
 * En local: solo con XTYLE_DEV_BYPASS=true.
 * ALLOW_DEV_BYPASS_IN_PROD=false por defecto (más estricto que ControlX).
 */
const ALLOW_DEV_BYPASS_IN_PROD = false;

export function isDevBypassEnabled(): boolean {
  if (process.env.XTYLE_DEV_BYPASS !== "true") {
    return false;
  }
  if (ALLOW_DEV_BYPASS_IN_PROD) {
    return true;
  }
  return process.env.NODE_ENV !== "production";
}

export function isDevClerkUserId(clerkUserId: string): boolean {
  return clerkUserId.startsWith("dev:");
}

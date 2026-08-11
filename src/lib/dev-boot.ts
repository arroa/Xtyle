declare global {
  // eslint-disable-next-line no-var
  var xtyleDevBootId: string | undefined;
}

export function getDevBootId(): string {
  if (process.env.XTYLE_DEV_BOOT_ID) {
    return process.env.XTYLE_DEV_BOOT_ID;
  }

  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return "prod-stable";
  }

  globalThis.xtyleDevBootId ??= crypto.randomUUID();
  return globalThis.xtyleDevBootId;
}

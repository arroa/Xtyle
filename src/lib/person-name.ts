/** Nombre visible: nunca el correo. */
export function personDisplayName(name: string | undefined | null): string {
  const value = (name ?? "").trim();
  if (!value || value.includes("@")) return "";
  return value;
}

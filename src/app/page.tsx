import { LandingAccess } from "@/components/landing-access";
import { XtyleAvatar } from "@/components/xtyle-avatar";
import { getCurrentUser } from "@/lib/current-user";
import { isDevBypassEnabled } from "@/lib/dev-flags";
import { getPostLoginPath } from "@/lib/users";

export default async function HomePage() {
  const user = await getCurrentUser();
  const bypassEnabled = isDevBypassEnabled();
  const destination = getPostLoginPath({
    isSuperAdmin: user?.isSuperAdmin ?? false,
    role: user?.role === "SUPER_ADMIN" ? null : user?.role ?? null,
  });

  return (
    <main className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(212,165,116,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(90,130,170,0.12),_transparent_45%)]"
      />
      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-10 px-6 py-16 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl space-y-5">
          <div className="flex items-center gap-3">
            <XtyleAvatar sizeClassName="size-12" />
            <p className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
              Xtyle
            </p>
          </div>
          <h1 className="font-display text-4xl leading-tight text-foreground sm:text-5xl">
            Fichas técnicas, sin armarlas a mano.
          </h1>
          <p className="max-w-md text-base text-muted-foreground sm:text-lg">
            Crea, clona y marca como definitivas las fichas de vestuario:
            encabezado, carátula y páginas Labels, Size Specs y Collage.
          </p>
          {bypassEnabled ? (
            <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
              Bypass activo (`XTYLE_DEV_BYPASS=true`)
            </p>
          ) : null}
        </div>

        <LandingAccess
          bypassEnabled={bypassEnabled}
          isAuthenticated={Boolean(user)}
          destination={destination}
        />
      </div>
    </main>
  );
}

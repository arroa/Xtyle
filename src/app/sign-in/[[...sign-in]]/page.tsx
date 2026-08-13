import { redirect } from "next/navigation";

import { XtyleSignInForm } from "@/components/xtyle-sign-in-form";
import { XtyleAvatar } from "@/components/xtyle-avatar";
import { getCurrentUser } from "@/lib/current-user";
import { isDevBypassEnabled } from "@/lib/dev-flags";
import { getPostLoginPath } from "@/lib/users";

export default async function SignInPage() {
  if (isDevBypassEnabled()) {
    redirect("/");
  }

  const user = await getCurrentUser();
  const destination = getPostLoginPath({
    isSuperAdmin: user?.isSuperAdmin ?? false,
    role: user?.role === "SUPER_ADMIN" ? null : user?.role ?? null,
  });

  if (user) {
    redirect(destination);
  }

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div className="flex items-center gap-3">
        <XtyleAvatar sizeClassName="size-10" />
        <h1 className="font-display text-2xl">Xtyle · Iniciar sesión</h1>
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <XtyleSignInForm destination={destination} />
      </div>
    </main>
  );
}

import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { ProductCreateForm } from "@/components/product-create-form";
import { getCurrentUser } from "@/lib/current-user";
import { isDevBypassEnabled } from "@/lib/dev-flags";
import { canEditProducts } from "@/lib/products";

export default async function NewProductPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (!canEditProducts(user.role, user.isSuperAdmin)) {
    redirect("/products");
  }

  return (
    <div className="min-h-full">
      <AppHeader
        email={user.email}
        name={user.name}
        role={user.role}
        canManageUsers={user.canManageUsers}
        bypassEnabled={isDevBypassEnabled()}
      />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <ProductCreateForm />
      </main>
    </div>
  );
}

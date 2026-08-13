import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { ProductCreateForm } from "@/components/product-create-form";
import { getCurrentUser } from "@/lib/current-user";
import { isDevBypassEnabled } from "@/lib/dev-flags";
import { canCreateOrCloneProducts } from "@/lib/product-access";
import { listFieldSuggestions } from "@/lib/products";

export default async function NewProductPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (!canCreateOrCloneProducts(user)) {
    redirect("/products");
  }

  const suggestions = await listFieldSuggestions();

  return (
    <div className="min-h-full">
      <AppHeader
        email={user.email}
        name={user.name}
        role={user.role}
        canManageUsers={user.canManageUsers}
        bypassEnabled={isDevBypassEnabled()}
      />
      <main className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        <ProductCreateForm suggestions={suggestions} />
      </main>
    </div>
  );
}

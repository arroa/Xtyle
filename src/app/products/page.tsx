import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { ProductsCatalog } from "@/components/products-catalog";
import { getCurrentUser } from "@/lib/current-user";
import { isDevBypassEnabled } from "@/lib/dev-flags";
import { canEditProducts, listProducts } from "@/lib/products";

export default async function ProductsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const products = await listProducts();
  const canEdit = canEditProducts(user.role, user.isSuperAdmin);

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
        <ProductsCatalog
          canEdit={canEdit}
          initialProducts={products.map((product) => ({
            id:
              product._id instanceof ObjectId
                ? product._id.toString()
                : String(product._id),
            brand: product.brand || product.cover?.data?.brand || "",
            style: product.style,
            shortDescription: product.shortDescription,
            status: product.status,
            version: product.version,
            updatedAt: product.updatedAt,
          }))}
        />
      </main>
    </div>
  );
}

import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { ProductsCatalog } from "@/components/products-catalog";
import { getCurrentUser } from "@/lib/current-user";
import { isDevBypassEnabled } from "@/lib/dev-flags";
import { canCreateOrCloneProducts, canMutateProduct } from "@/lib/product-access";
import { listProducts } from "@/lib/products";
import { resolveDesignerNames } from "@/lib/users";

export default async function ProductsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const products = await listProducts();
  const designerNames = await resolveDesignerNames(
    products.map((product) => ({
      designer: product.cover.data.designer,
      createdByEmail: product.createdByEmail,
    })),
  );
  const canCreate = canCreateOrCloneProducts(user);
  const canManageAll = user.isSuperAdmin || user.role === "ADMIN";

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
          canCreate={canCreate}
          canClone={canCreate}
          canManageAll={canManageAll}
          currentUserEmail={user.email}
          initialProducts={products.map((product, index) => ({
            id:
              product._id instanceof ObjectId
                ? product._id.toString()
                : String(product._id),
            brand: product.brand,
            retailer: product.retailer,
            season: product.season,
            style: product.style,
            shortDescription: product.shortDescription,
            status: product.status,
            version: product.version,
            updatedAt: product.updatedAt,
            createdByEmail: product.createdByEmail,
            designerName: designerNames[index] ?? "",
            canMutate: canMutateProduct(user, product),
          }))}
        />
      </main>
    </div>
  );
}

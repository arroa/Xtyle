import { ObjectId } from "mongodb";
import { notFound, redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { ProductWorkspace } from "@/components/product-workspace";
import { getCurrentUser } from "@/lib/current-user";
import { isDevBypassEnabled } from "@/lib/dev-flags";
import { canEditProducts, getProductById } from "@/lib/products";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

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
        <ProductWorkspace
          canEdit={canEdit}
          product={{
            id:
              product._id instanceof ObjectId
                ? product._id.toString()
                : String(product._id),
            brand: product.brand || product.cover?.data?.brand || "",
            style: product.style,
            shortDescription: product.shortDescription,
            status: product.status,
            version: product.version,
            cover: product.cover,
            label: product.label,
            sizeTable: product.sizeTable,
            sizeCuts: product.sizeCuts,
            collages: product.collages,
          }}
        />
      </main>
    </div>
  );
}

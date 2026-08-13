import { ObjectId } from "mongodb";
import { notFound, redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { ProductWorkspace } from "@/components/product-workspace";
import { getCurrentUser } from "@/lib/current-user";
import { isDevBypassEnabled } from "@/lib/dev-flags";
import {
  canMutateProduct,
  canReassignDesigner,
} from "@/lib/product-access";
import { getProductById, listFieldSuggestions } from "@/lib/products";
import { listAssignableDesigners, resolveDesignerName } from "@/lib/users";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  const canEdit = canMutateProduct(user, product);
  const suggestions = await listFieldSuggestions();
  const designers = canReassignDesigner(user)
    ? await listAssignableDesigners()
    : [];
  const designerName = await resolveDesignerName({
    designer: product.cover.data.designer,
    createdByEmail: product.createdByEmail,
  });

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
          canReassignDesigner={canReassignDesigner(user)}
          designers={designers}
          createdByEmail={product.createdByEmail}
          suggestions={suggestions}
          product={{
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
            cover: {
              ...product.cover,
              data: {
                ...product.cover.data,
                designer: designerName,
              },
            },
            pages: product.pages,
          }}
        />
      </main>
    </div>
  );
}

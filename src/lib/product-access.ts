export type AccessActor = {
  email: string;
  role: string | null;
  isSuperAdmin: boolean;
};

export type OwnedProduct = {
  createdByEmail: string;
};

function sameEmail(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Admin y Editor pueden crear y clonar (la copia queda del que clona). */
export function canCreateOrCloneProducts(actor: AccessActor): boolean {
  if (actor.isSuperAdmin) return true;
  return actor.role === "ADMIN" || actor.role === "EDITOR";
}

/** Editar, eliminar o marcar Definitiva: Admin todas; Editor solo las suyas. */
export function canMutateProduct(
  actor: AccessActor,
  product: OwnedProduct,
): boolean {
  if (actor.isSuperAdmin || actor.role === "ADMIN") return true;
  if (actor.role !== "EDITOR") return false;
  return sameEmail(product.createdByEmail, actor.email);
}

/** Solo Admin / SuperAdmin reasigna el Designer (dueño de la ficha). */
export function canReassignDesigner(actor: AccessActor): boolean {
  return actor.isSuperAdmin || actor.role === "ADMIN";
}

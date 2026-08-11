import Link from "next/link";

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-4 px-6 py-16 text-center">
      <h1 className="font-display text-2xl">Registro cerrado</h1>
      <p className="text-sm text-muted-foreground">
        Los usuarios se crean desde la aplicación por un Admin o SuperAdmin.
      </p>
      <Link href="/sign-in" className="text-sm text-primary underline-offset-2 hover:underline">
        Ir a ingresar
      </Link>
    </main>
  );
}

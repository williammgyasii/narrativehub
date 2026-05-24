import { AuthView } from "@neondatabase/auth-ui";

export const dynamicParams = false;

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
      <AuthView path={path} />
    </main>
  );
}

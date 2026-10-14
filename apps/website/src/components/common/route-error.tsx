import { type ErrorComponentProps, useRouter } from '@tanstack/react-router';

export function RouteError({ reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <main className="space-y-4 p-10">
      <h1 className="text-2xl font-bold">Unable to load this page</h1>
      <p>Please try again in a moment.</p>
      <button
        type="button"
        onClick={async () => {
          await router.invalidate();
          reset();
        }}
        className="underline"
      >
        Try again
      </button>
    </main>
  );
}

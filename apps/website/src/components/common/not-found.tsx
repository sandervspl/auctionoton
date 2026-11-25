import { Link } from '@tanstack/react-router';

export function NotFound() {
  return (
    <main className="space-y-2 p-10">
      <h1 className="text-2xl font-bold">Not Found</h1>
      <p>Could not find requested resource</p>
      <Link to="/" className="underline">
        Return Home
      </Link>
    </main>
  );
}

import { api } from "./api";

/** Absolute backend URL for server-side fetches (relative rewrites only work client-side). */
function serverBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
}

export async function serverApi<T>(path: string): Promise<T> {
  const base = serverBase();
  // Reuse the client wrapper but with an absolute URL
  const res = await fetch(`${base}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Server fetch failed: ${res.status} ${path}`);
  }
  return (await res.json()) as T;
}

export { api };

let csrf = "";
export function setCSRF(value: string) {
  csrf = value;
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      data?.error?.message ||
        "The store is temporarily unavailable. Please try again.",
    );
  return data;
}
export const money = (value: string | number) =>
  new Intl.NumberFormat("en-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(Number(value));

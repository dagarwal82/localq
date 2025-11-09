import { QueryClient, QueryFunction } from "@tanstack/react-query";

function join(base: string | undefined, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const b = (base || "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const API_URL = import.meta.env.VITE_API_URL || '';
  let headers: Record<string, string> = {};
  let body: any = undefined;
  if (data instanceof FormData) {
    body = data;
    // Do not set Content-Type for FormData; browser will set it
  } else if (data) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(data);
  }
  const fullUrl = join(API_URL, url);
  const res = await fetch(fullUrl, {
    method,
    headers,
    body,
    credentials: "include", // always send cookies
  });

  await throwIfResNotOk(res);
  
  // For DELETE requests with 204 No Content, return undefined
  if (res.status === 204) {
    return undefined;
  }
  
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const API_URL = import.meta.env.VITE_API_URL || '';
  const path = queryKey.join("/") as string;
  const fullUrl = join(API_URL, path);
    const res = await fetch(fullUrl, {
      credentials: "include", // always send cookies
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

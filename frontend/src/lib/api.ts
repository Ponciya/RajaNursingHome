const API_BASE_URL = "http://localhost:4000"; // <-- ADD THIS

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  // Only set Content-Type for non-FormData bodies
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
}

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { // <-- USE THE VARIABLE HERE
      ...options,
      headers,
      credentials: "include",
    });
  } catch (error) {
    // Ithu unga backend server run aagala na ithu error kaatum
    throw new ApiError(0, "Cannot connect to backend server. Is it running?");
  }

  const data: unknown = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
        ? data.error
        : "Request failed";
    throw new ApiError(response.status, message);
  }

  return data as T;
}
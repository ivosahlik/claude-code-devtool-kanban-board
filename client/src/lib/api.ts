export type Column = {
  id: string;
  title: string;
  order: number;
};

export type Card = {
  id: string;
  columnId: string;
  title: string;
  description: string;
  order: number;
};

export type Board = {
  columns: Column[];
  cards: Card[];
};

export type Project = {
  id: string;
  name: string;
  createdAt: string;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const UNREACHABLE = "Could not reach the server";

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong";
}

function fallbackMessage(status: number): string {
  if (status === 502 || status === 503 || status === 504) return UNREACHABLE;
  if (status >= 500) return `Server error (${status})`;
  return `Request failed (${status})`;
}

async function readError(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (body && typeof body === "object" && "error" in body) {
      const { error } = body;
      if (typeof error === "string" && error.trim()) return error;
    }
  } catch {
    // Empty or non-JSON body: use the status fallback.
  }
  return fallbackMessage(res.status);
}

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(0, UNREACHABLE);
  }
  if (!res.ok) {
    throw new ApiError(res.status, await readError(res));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listProjects: () => request<Project[]>("/api/projects"),
  createProject: (name: string) =>
    request<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  renameProject: (id: string, name: string) =>
    request<Project>(`/api/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  deleteProject: (id: string) =>
    request<void>(`/api/projects/${id}`, { method: "DELETE" }),

  getBoard: (projectId: string) =>
    request<Board>(`/api/projects/${projectId}/board`),
  createColumn: (projectId: string, title: string) =>
    request<Column>(`/api/projects/${projectId}/columns`, {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  renameColumn: (projectId: string, id: string, title: string) =>
    request<Column>(`/api/projects/${projectId}/columns/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }),
  deleteColumn: (projectId: string, id: string) =>
    request<void>(`/api/projects/${projectId}/columns/${id}`, {
      method: "DELETE",
    }),
  createCard: (
    projectId: string,
    columnId: string,
    title: string,
    description: string,
  ) =>
    request<Card>(`/api/projects/${projectId}/cards`, {
      method: "POST",
      body: JSON.stringify({ columnId, title, description }),
    }),
  updateCard: (
    projectId: string,
    id: string,
    patch: Partial<Pick<Card, "title" | "description" | "columnId" | "order">>,
  ) =>
    request<Card>(`/api/projects/${projectId}/cards/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteCard: (projectId: string, id: string) =>
    request<void>(`/api/projects/${projectId}/cards/${id}`, {
      method: "DELETE",
    }),
};

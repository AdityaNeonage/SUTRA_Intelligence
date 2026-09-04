import type {
  AuthSession,
  CaseRecord,
  DemoSeedResponse,
  EvidenceDocumentRecord,
  EvidenceUploadResponse,
  GraphResponse,
  HealthResponse,
  IngestionRecord,
  LoginInput,
  PageResponse,
  CopilotResponse,
} from "../types/api";

export class ApiClientError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") ?? "";

function makeUrl(path: string, query?: Record<string, string | number | undefined>) {
  const queryString = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") queryString.set(key, String(value));
  });
  const suffix = queryString.size > 0 ? `?${queryString.toString()}` : "";
  return `${configuredBaseUrl}${path}${suffix}`;
}

function extractError(payload: unknown, fallback: string) {
  if (typeof payload !== "object" || payload === null) return { message: fallback };
  const body = payload as Record<string, unknown>;
  const error = typeof body.error === "object" && body.error !== null
    ? (body.error as Record<string, unknown>)
    : body;
  const detail = error.detail ?? body.detail;
  const message = error.message ?? detail ?? body.message ?? fallback;
  return {
    message: typeof message === "string" ? message : fallback,
    code: typeof error.code === "string" ? error.code : undefined,
    details: error.details ?? detail,
  };
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
  query?: Record<string, string | number | undefined>,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(makeUrl(path, query), { ...options, headers });
  } catch {
    throw new ApiClientError("The SUTRA API could not be reached. Check that the backend is running.", 0);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const payload: unknown = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    const error = extractError(payload, `Request failed with status ${response.status}.`);
    throw new ApiClientError(error.message, response.status, error.code, error.details);
  }
  return payload as T;
}

export const sutraApi = {
  login(input: LoginInput) {
    return request<AuthSession>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  getHealth() {
    return request<HealthResponse>("/api/system/health");
  },

  getCurrentUser(token: string) {
    return request<AuthSession["user"]>("/api/auth/me", {}, token);
  },

  seedDemo(token: string) {
    return request<DemoSeedResponse>("/api/demo/seed", { method: "POST" }, token);
  },

  listCases(token: string, offset = 0, limit = 100) {
    return request<PageResponse<CaseRecord>>("/api/cases", {}, token, { offset, limit });
  },

  getCase(token: string, caseId: string) {
    return request<CaseRecord>(`/api/cases/${encodeURIComponent(caseId)}`, {}, token);
  },

  getNeighborhood(token: string, params: { caseId?: string; seedId?: string; depth?: number }) {
    return request<GraphResponse>("/api/graph/neighborhood", {}, token, {
      case_id: params.caseId,
      seed_id: params.seedId,
      depth: params.depth ?? 1,
    });
  },

  getBridges(token: string, caseId?: string) {
    return request<unknown>("/api/analytics/bridges", {}, token, { case_id: caseId });
  },

  getRelatedCases(token: string, caseId?: string) {
    return request<unknown>("/api/cross-case", {}, token, { case_id: caseId });
  },

  getTimeline(token: string, caseId?: string) {
    return request<unknown>("/api/analytics/timeline", {}, token, { case_id: caseId });
  },

  uploadEvidence(token: string, file: File, caseId?: string) {
    const body = new FormData();
    body.append("file", file);
    return request<EvidenceUploadResponse>("/api/ingestion/upload", { method: "POST", body }, token, { case_id: caseId });
  },

  listIngestions(token: string, caseId?: string) {
    return request<{ items: IngestionRecord[] }>("/api/ingestion", {}, token, { case_id: caseId, limit: 200 });
  },

  listDocuments(token: string, params?: { caseId?: string; ingestionId?: string; q?: string }) {
    return request<{ items: EvidenceDocumentRecord[]; limit: number }>("/api/documents", {}, token, {
      case_id: params?.caseId,
      ingestion_id: params?.ingestionId,
      q: params?.q,
      limit: 200,
    });
  },

  getDocument(token: string, documentId: string) {
    return request<EvidenceDocumentRecord>(`/api/documents/${encodeURIComponent(documentId)}`, {}, token);
  },

  queryCopilot(token: string, input: { question: string; caseId?: string; entityId?: string }) {
    return request<CopilotResponse>("/api/copilot/query", {
      method: "POST",
      body: JSON.stringify({ question: input.question, case_id: input.caseId, entity_id: input.entityId }),
    }, token);
  },
};

/** Console arguments can contain credentials, serialized IPC or provider error bodies. */
export const filterDiagnosticBreadcrumb = <T extends { category?: string }>(breadcrumb: T): T | null =>
  breadcrumb.category === "console" ? null : breadcrumb;

/** Keep failure categories useful without logging error messages or response contents. */
export const summarizeDiagnosticError = (error: unknown): { kind: string; status?: number } => {
  const value = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
  const kind = ["http", "network", "parse", "unknown"].includes(String(value.type)) ? String(value.type) : "exception";
  return { kind, ...(typeof value.status === "number" ? { status: value.status } : {}) };
};

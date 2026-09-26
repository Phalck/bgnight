// Message of anything that was thrown (catch clauses give `unknown`)
export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

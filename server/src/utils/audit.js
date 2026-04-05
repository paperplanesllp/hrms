export function auditLog(action, meta = {}) {
  console.log(`[AUDIT] ${action}`, meta);
}
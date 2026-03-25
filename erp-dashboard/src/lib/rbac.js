export function hasRole(user, allowed = []) {
  if (!allowed?.length) return true;
  return allowed.includes(user?.role);
}
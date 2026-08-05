export const dashboardRoutes = {
  1: '/officeboy/dashboard',
  2: '/faculty/dashboard',
  3: '/supervisor/dashboard',
};

export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try {
    const item = localStorage.getItem('user');
    if (!item) return null;
    return JSON.parse(item);
  } catch {
    return null;
  }
}

export function getDashboardRoute(role) {
  return dashboardRoutes[Number(role)] ?? null;
}

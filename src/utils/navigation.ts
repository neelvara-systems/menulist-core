import IRoute from "src/types/navigation";

// NextJS Requirement
export const isWindowAvailable = () => typeof window !== "undefined";

export const findCurrentRoute = (routes: readonly IRoute[]): IRoute | undefined => {
  if (!isWindowAvailable()) return undefined;
  const pathname = window.location.pathname;
  return [...routes]
    .sort((left, right) => right.url.length - left.url.length)
    .find((route) => (
      route.url === '/'
        ? pathname === '/'
        : pathname === route.url || pathname.startsWith(`${route.url}/`)
    ));
};

export const getActiveRoute = (routes: readonly IRoute[]): string => {
  const route = findCurrentRoute(routes);
  return route?.name || "Default Brand Text";
};

export const getActiveNavbar = (routes: readonly IRoute[]): boolean => {
  return findCurrentRoute(routes)?.secondary === true;
};

export const getActiveNavbarText = (routes: readonly IRoute[]): string | boolean => {
  return getActiveRoute(routes) || false;
};

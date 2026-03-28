import { useRouter } from "next/navigation";
import IRoute from "src/types/navigation";

// NextJS Requirement
export const isWindowAvailable = () => typeof window !== "undefined";

export const findCurrentRoute = (routes: IRoute[]): IRoute => {
  const foundRoute: any = routes.find((route) => {
    if (isWindowAvailable() && window.location.href.indexOf(route.url + route.url) !== -1)
      return route
  });

  return foundRoute;
};

export const getActiveRoute = (routes: IRoute[]): string => {
  const route = findCurrentRoute(routes);
  return route?.name || "Default Brand Text";
};

export const getActiveNavbar = (routes: IRoute[]): boolean => {
  const route: any = findCurrentRoute(routes);
  return route?.secondary;
};

export const getActiveNavbarText = (routes: IRoute[]): string | boolean => {
  return getActiveRoute(routes) || false;
};

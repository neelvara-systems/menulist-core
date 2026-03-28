import { ReactComponentElement } from "react";

interface IRoute {
  name: string;
  url: string;
  icon: ReactComponentElement;
  secondary?: boolean;
}

export default IRoute;
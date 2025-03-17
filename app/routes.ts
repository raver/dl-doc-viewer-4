import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [index("routes/home.tsx"),
route("budd/:query", "routes/document.tsx"),] satisfies RouteConfig;

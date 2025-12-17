import { onRequestGet as __api_auth_js_onRequestGet } from "E:\\Documents\\rifasnuevo\\functions\\api\\auth.js"
import { onRequest as ___middleware_js_onRequest } from "E:\\Documents\\rifasnuevo\\functions\\_middleware.js"

export const routes = [
    {
      routePath: "/api/auth",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_auth_js_onRequestGet],
    },
  {
      routePath: "/",
      mountPath: "/",
      method: "",
      middlewares: [___middleware_js_onRequest],
      modules: [],
    },
  ]
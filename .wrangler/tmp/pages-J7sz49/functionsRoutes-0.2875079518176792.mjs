import { onRequest as __api_auth_js_onRequest } from "C:\\Users\\PC\\Documents\\GitHub\\functions\\api\\auth.js"
import { onRequest as __api_puntos_js_onRequest } from "C:\\Users\\PC\\Documents\\GitHub\\functions\\api\\puntos.js"
import { onRequest as __api_rifa_js_onRequest } from "C:\\Users\\PC\\Documents\\GitHub\\functions\\api\\rifa.js"
import { onRequest as ___middleware_js_onRequest } from "C:\\Users\\PC\\Documents\\GitHub\\functions\\_middleware.js"

export const routes = [
    {
      routePath: "/api/auth",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_auth_js_onRequest],
    },
  {
      routePath: "/api/puntos",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_puntos_js_onRequest],
    },
  {
      routePath: "/api/rifa",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_rifa_js_onRequest],
    },
  {
      routePath: "/",
      mountPath: "/",
      method: "",
      middlewares: [___middleware_js_onRequest],
      modules: [],
    },
  ]
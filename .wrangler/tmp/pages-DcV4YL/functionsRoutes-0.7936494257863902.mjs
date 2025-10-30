import { onRequestPost as __api_clothing_advice_js_onRequestPost } from "/Users/ulysse/Dropbox/Dev/rw/functions/api/clothing-advice.js"
import { onRequestPost as __api_rain_forecast_js_onRequestPost } from "/Users/ulysse/Dropbox/Dev/rw/functions/api/rain-forecast.js"

export const routes = [
    {
      routePath: "/api/clothing-advice",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_clothing_advice_js_onRequestPost],
    },
  {
      routePath: "/api/rain-forecast",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_rain_forecast_js_onRequestPost],
    },
  ]
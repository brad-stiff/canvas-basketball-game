/// <reference types="vite/client" />

import type { CanvasBasketballApi } from '../../preload/index'

declare global {
  interface Window {
    api: CanvasBasketballApi
  }
}

export {}

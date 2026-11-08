import { contextBridge, ipcRenderer } from 'electron'
import type { CareerSave } from '../game/save/types'

export type SaveWriteResult = { ok: true; path: string }
export type SaveReadResult =
  | { ok: true; data: CareerSave }
  | { ok: false; reason: 'missing' | 'error'; message?: string }

const api = {
  platform: process.platform,
  saveWrite: (data: CareerSave): Promise<SaveWriteResult> =>
    ipcRenderer.invoke('save:write', data),
  saveRead: (): Promise<SaveReadResult> => ipcRenderer.invoke('save:read'),
  saveClear: (): Promise<{ ok: true }> => ipcRenderer.invoke('save:clear')
}

contextBridge.exposeInMainWorld('api', api)

export type CanvasBasketballApi = typeof api

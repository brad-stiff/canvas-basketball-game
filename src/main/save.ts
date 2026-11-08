import { app, ipcMain } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'

const SAVE_FILE = 'career.json'

function savePath(): string {
  return join(app.getPath('userData'), SAVE_FILE)
}

export function registerSaveIpc(): void {
  ipcMain.handle('save:write', async (_event, data: unknown) => {
    const path = savePath()
    await fs.writeFile(path, JSON.stringify(data, null, 2), 'utf8')
    return { ok: true as const, path }
  })

  ipcMain.handle('save:read', async () => {
    const path = savePath()
    try {
      const raw = await fs.readFile(path, 'utf8')
      return { ok: true as const, data: JSON.parse(raw) as unknown }
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code
      if (code === 'ENOENT') {
        return { ok: false as const, reason: 'missing' as const }
      }
      return { ok: false as const, reason: 'error' as const, message: String(err) }
    }
  })

  ipcMain.handle('save:clear', async () => {
    const path = savePath()
    try {
      await fs.unlink(path)
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code
      if (code !== 'ENOENT') throw err
    }
    return { ok: true as const }
  })
}

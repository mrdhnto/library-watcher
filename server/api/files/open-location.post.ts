import { exec } from 'child_process'
import { dirname } from 'path'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { filepath } = body

  if (!filepath || typeof filepath !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'filepath is required' })
  }

  if (process.platform === 'win32') {
    exec(`explorer /select,"${filepath}"`)
  } else if (process.platform === 'darwin') {
    exec(`open -R "${filepath}"`)
  } else {
    exec(`xdg-open "${dirname(filepath)}"`)
  }

  return { success: true }
})
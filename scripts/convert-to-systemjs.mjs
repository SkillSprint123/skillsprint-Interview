import { transformFileAsync } from '@babel/core'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath, URL } from 'node:url'

const entry = new URL('../dist/index.js', import.meta.url)
const result = await transformFileAsync(fileURLToPath(entry), {
  babelrc: false,
  configFile: false,
  compact: true,
  plugins: ['@babel/plugin-transform-modules-systemjs'],
})

if (!result?.code) throw new Error('Could not convert the interview bundle to System.register')
await writeFile(entry, result.code)

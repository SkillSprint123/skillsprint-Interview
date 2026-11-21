import assert from 'node:assert/strict'
import console from 'node:console'
import { readFile } from 'node:fs/promises'
import { URL } from 'node:url'
import { JSDOM } from 'jsdom'

const entry = new URL('../dist/index.js', import.meta.url)
const loader = new URL(import.meta.resolve('systemjs/dist/system.min.js'))
assert.match(await readFile(entry, 'utf8'), /^System\.register\(/)

const dom = new JSDOM('<div id="interview"></div>', {
  url: entry.href,
  resources: 'usable',
  runScripts: 'dangerously',
})

try {
  const { window } = dom
  window.eval(await readFile(loader, 'utf8'))
  const module = await window.System.import(entry.href)
  assert.equal(module.contractVersion, 1)
  const container = window.document.getElementById('interview')
  const instance = module.mount(container, {
    basePath: '/skillsprint/interview',
    apiBaseUrl: '/api',
    user: null,
    navigate() {},
  })
  assert.ok(container.querySelector('textarea'))
  assert.ok(container.querySelector('[data-interview-styles] style')?.textContent)
  await instance.unmount()
  assert.equal(container.childElementCount, 0)
  console.log('PASS: SystemJS imports the v1 interview module, mounts and cleans up')
} finally {
  dom.window.close()
}

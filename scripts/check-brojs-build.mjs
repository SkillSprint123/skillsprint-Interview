import assert from 'node:assert/strict'
import console from 'node:console'
import { readFileSync, readdirSync } from 'node:fs'
import { URL } from 'node:url'
import { JSDOM } from 'jsdom'

const source = readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8')
assert.deepEqual(readdirSync(new URL('../dist/', import.meta.url)), ['index.js'])

// SystemJS's AMD extra executes UMD through define(), as BroJS does on the stand.
for (const loader of ['amd', 'global']) {
  const dom = new JSDOM('<div id="app"></div>', {
    url: 'https://example.test/interview',
    runScripts: 'outside-only',
  })
  try {
    let module
    if (loader === 'amd') {
      dom.window.define = (dependencies, factory) => {
        module = {}
        assert.deepEqual(Array.from(dependencies), ['exports'])
        factory(module)
      }
      dom.window.define.amd = {}
    }
    dom.window.eval(source)
    module ??= dom.window.SkillSprintInterview
    assert.equal(typeof module.mount, 'function')
    assert.equal(typeof module.unmount, 'function')
    assert.ok(module.default)
    const container = dom.window.document.getElementById('app')
    module.mount(module.default, container, { push() {} })
    assert.ok(container.querySelector('textarea'))
    module.unmount()
    module.unmount()
    assert.equal(container.childElementCount, 0)
    console.log(`PASS: BroJS ${loader} bundle loads, mounts and unmounts`)
  } finally {
    dom.window.close()
  }
}

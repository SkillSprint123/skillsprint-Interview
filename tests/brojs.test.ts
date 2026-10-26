import { afterEach, expect, test, vi } from 'vite-plus/test'
import component, { mount, unmount } from '../src/brojs'

afterEach(() => {
  unmount()
  document.body.replaceChildren()
})

test('BroJS mounts into its second argument and replaces the previous instance', () => {
  const first = document.createElement('div')
  const second = document.createElement('div')
  document.body.append(first, second)
  const context = { push: vi.fn() }
  mount(component, first, context)
  expect(first.querySelector('textarea')).not.toBeNull()
  mount(component, second, context)
  expect(first.childElementCount).toBe(0)
  expect(second.querySelector('textarea')).not.toBeNull()
  unmount()
  unmount()
  expect(second.childElementCount).toBe(0)
})

test('BroJS supports the default app container and remounts after unmount', () => {
  const container = document.createElement('div')
  container.id = 'app'
  document.body.append(container)
  mount(component, undefined, { push: vi.fn() })
  expect(container.querySelector('textarea')).not.toBeNull()
  unmount()
  mount(component, container, { push: vi.fn() })
  expect(container.querySelector('textarea')?.value).toBe('')
})

test('BroJS reports a missing container or navigation function', () => {
  expect(() => mount(component, null, { push: vi.fn() })).toThrow('контейнер')
  expect(() => mount(component, document.body, { push: undefined! })).toThrow('push')
})

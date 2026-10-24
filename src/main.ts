import { mount } from './index'

const container = document.querySelector<HTMLElement>('#app')
if (!container) throw new Error('Demo container is missing')

const instance = mount(container, {
  basePath: '/interview',
  apiBaseUrl: '/api',
  user: null,
  navigate: (path) => {
    // Local preview does not own the root's other routes.
    window.alert(`В корневом SkillSprint здесь откроется раздел: ${path}`)
  },
})

if (import.meta.hot) import.meta.hot.dispose(() => instance.unmount())

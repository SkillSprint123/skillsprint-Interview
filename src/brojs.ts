import InterviewPage from './pages/interview/InterviewPage.vue'
import { mount as mountNano } from './index'

// BroJS calls mount(component.default, element, { push }) and a separate unmount().
export default InterviewPage

let instance: ReturnType<typeof mountNano> | undefined

export function mount(
  _component: unknown,
  element: HTMLElement | null = document.getElementById('app'),
  { push }: { push: (path: string) => void },
) {
  if (!element) throw new Error('SkillSprint Interview: контейнер подключения не найден')
  if (typeof push !== 'function') throw new Error('SkillSprint Interview: нужен BroJS push')
  unmount()
  instance = mountNano(element, {
    basePath: '/interview',
    apiBaseUrl: '/api',
    user: null,
    navigate: (path) => push(path),
  })
}

export function unmount() {
  void instance?.unmount()
  instance = undefined
}

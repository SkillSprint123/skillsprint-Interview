declare module 'systemjs/dist/system.min.js' {}

interface Window {
  System: { import(url: string): Promise<unknown> }
}

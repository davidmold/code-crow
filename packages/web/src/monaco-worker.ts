// Monaco Editor worker configuration for Vite
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'

// Type declarations for Monaco environment
declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorker(moduleId: unknown, label: string): Worker
    }
  }
}

if (typeof window !== 'undefined') {
  (self as unknown as Window).MonacoEnvironment = {
    getWorker(_: unknown, label: string) {
      switch (label) {
        case 'typescript':
        case 'javascript':
          return new tsWorker()
        case 'html':
        case 'handlebars':
        case 'razor':
          return new htmlWorker()
        case 'css':
        case 'scss':
        case 'less':
          return new cssWorker()
        case 'json':
          return new jsonWorker()
        default:
          return new editorWorker()
      }
    }
  }
}
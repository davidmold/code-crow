// Monaco Editor worker configuration for Vite
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'

if (typeof window !== 'undefined') {
  (self as any).MonacoEnvironment = {
    getWorker(_: any, label: string) {
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
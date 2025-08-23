export function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
}

export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return '0 Byte'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

export function formatDate(date: Date): string {
  return date.toLocaleString()
}

export function isValidProjectPath(path: string): boolean {
  return path.length > 0 && !path.includes('..')
}

export function sanitizePath(path: string): string {
  return path.replace(/\.\./g, '').replace(/\/+/g, '/')
}
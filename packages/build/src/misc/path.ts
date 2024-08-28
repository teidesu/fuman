import { fileURLToPath } from 'node:url'

export function normalizeFilePath(filePath: string | URL): string {
    if (filePath instanceof URL) {
        return fileURLToPath(filePath)
    } else if (filePath.startsWith('file://')) {
        return fileURLToPath(new URL(filePath))
    }

    return filePath
}

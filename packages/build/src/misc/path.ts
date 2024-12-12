import { fileURLToPath, URL as NodeURL } from 'node:url'

export function normalizeFilePath(filePath: string | URL | NodeURL): string {
    if (filePath instanceof URL || filePath instanceof NodeURL) {
        return fileURLToPath(filePath)
    } else if (filePath.startsWith('file://')) {
        return fileURLToPath(new URL(filePath))
    }

    return filePath
}

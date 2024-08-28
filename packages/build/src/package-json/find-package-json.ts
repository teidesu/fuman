import * as path from 'node:path'

import { LruMap } from '@fuman/utils'

import { fileExists } from '../misc/fs.js'
import { normalizeFilePath } from '../misc/path.js'

const _findPackageJsonCache = new LruMap<string, string | null>(32)
/**
 * Find the closest package.json file
 *
 * @param from The directory (or file) to start searching from
 * @example `findPackageJson(import.meta.url)` // returns the package.json file of this package
 */
export async function findPackageJson(from: string | URL): Promise<string | null> {
    from = normalizeFilePath(from)

    const cached = _findPackageJsonCache.get(from)
    if (cached != null) return cached

    let current = from

    while (true) {
        if (current === '/') return null

        const file = path.join(current, 'package.json')
        if (await fileExists(file)) {
            _findPackageJsonCache.set(from, file)
            return file
        }

        const parent = path.join(current, '..')
        if (parent === current) {
            _findPackageJsonCache.set(from, null)
            return null
        }

        current = parent
    }
}

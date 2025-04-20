import type { ImportSpecifier } from './external-libs.js'
import * as fs from 'node:fs'
import * as fsp from 'node:fs/promises'
import { join } from 'node:path'

import process from 'node:process'
import { ffetchAddons, ffetchBase } from '@fuman/fetch'
import { ffetchZodAdapter } from '@fuman/fetch/zod'
import { webReadableToFuman, write } from '@fuman/io'
import { nodeWritableToFuman } from '@fuman/node'
import { asyncPool } from '@fuman/utils'
import semver from 'semver'

import { z } from 'zod'

import { directoryExists } from '../../misc/fs.js'
import { getModuleCacheDirectory } from './external-libs.js'

const DEFAULT_REGISTRY = process.env.JSR_URL ?? 'https://jsr.io'

/** check if a specific version (or a package at all) is available in the jsr registry */
export async function jsrCheckVersion(params: {
  registry?: string
  package: string
  version?: string
}): Promise<boolean> {
  const {
    registry = DEFAULT_REGISTRY,
    package: packageName,
    version,
  } = params

  const res = await ffetchBase(`/${packageName}/meta${version != null ? `_${version}` : ''}.json`, {
    baseUrl: registry,
    validateResponse: false,
  })
  return res.status === 200
}

export async function downloadJsrPackage(
  specifier: ImportSpecifier,
  params?: {
    registry?: string
    force?: boolean
  },
): Promise<string> {
  if (specifier.registry !== 'jsr') {
    throw new Error('Invalid registry')
  }

  const registry = params?.registry ?? DEFAULT_REGISTRY
  const ffetch = ffetchBase.extend({
    baseUrl: registry,
    addons: [
      ffetchAddons.parser(ffetchZodAdapter()),
    ],
  })

  const targetDir = `${specifier.packageName.replace(/\//g, '+')}@${specifier.version}`
  const registryHost = new URL(registry).host
  const cacheDir = join(getModuleCacheDirectory(), 'jsr', registryHost, targetDir)

  // check if package is already downloaded
  if (await directoryExists(cacheDir)) {
    if (params?.force) {
      // remove existing package
      await fsp.rm(cacheDir, { recursive: true })
    } else {
      return cacheDir
    }
  }

  // download meta.json
  const meta = await ffetch(`${specifier.packageName}/meta.json`)
    .parsedJson(z.object({
      versions: z.record(z.unknown()),
    }))

  const availableVersions = Object.keys(meta.versions)

  // find matching version
  const version = semver.maxSatisfying(availableVersions, specifier.version)
  if (version == null) {
    throw new Error(`No matching version for ${specifier.packageName}@${specifier.version}`)
  }

  // jsr doesn't have tarballs, so we have to download the whole package file by file
  await fsp.mkdir(cacheDir, { recursive: true })
  const versionMeta = await ffetch(`${specifier.packageName}/${version}_meta.json`)
    .parsedJson(z.object({
      manifest: z.record(z.unknown()),
    }))

  const fetchFile = async (file: string) => {
    file = file.replace(/^\//, '')
    const filePath = join(cacheDir, file)
    await fsp.mkdir(join(filePath, '..'), { recursive: true })

    const from = await ffetch(`${specifier.packageName}/${version}/${file}`).stream()
    const into = nodeWritableToFuman(fs.createWriteStream(filePath))
    await write.pipe(into, webReadableToFuman(from))
  }

  await asyncPool(Object.keys(versionMeta.manifest), fetchFile, { limit: 16 })

  return cacheDir
}

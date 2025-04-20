import { createFfetch, ffetchAddons } from '@fuman/fetch'

const ffetch = /* #__PURE__ */ createFfetch({
  addons: [
    /* #__PURE__ */ ffetchAddons.timeout(),
    /* #__PURE__ */ ffetchAddons.retry(),
  ],
  retry: { maxRetries: 3 },
  timeout: 5000,
})

export async function jsrGetScopeInfo(params: {
  scope: string
  registry: string
}): Promise<any> {
  const { scope, registry } = params
  const res = await ffetch(`/api/scopes/${scope}`, {
    baseUrl: registry,
    validateResponse: false,
  })

  if (res.status === 404) return null
  if (res.status !== 200) {
    throw new Error(`Failed to get scope info: ${res.statusText}`)
  }

  return res.json()
}

export async function jsrCreateScope(params: {
  name: string
  registry: string
  token: string
  quiet?: boolean
}): Promise<void> {
  const { name, registry, token, quiet } = params

  const create = await ffetch('/api/scopes', {
    baseUrl: registry,
    headers: {
      Cookie: `token=${token}`,
    },
    json: { scope: name },
  })

  if (create.status !== 200) {
    throw new Error(`Failed to create scope: ${create.statusText} ${await create.text()}`)
  }

  if (!quiet) {
    // eslint-disable-next-line no-console
    console.log('Created scope @%s', name)
  }
}

export async function jsrMaybeCreatePackage(params: {
  name: string
  registry: string
  token: string
  quiet?: boolean
}): Promise<void> {
  const { name, registry, token, quiet } = params

  const [scopeWithAt, packageName] = name.split('/')
  if (!packageName || !scopeWithAt || !scopeWithAt.startsWith('@')) {
    throw new Error('Invalid package name')
  }
  const scope = scopeWithAt.slice(1)

  // check if the package even exists
  const packageMeta = await ffetch(`/api/scopes/${scope}/packages/${packageName}`, {
    baseUrl: registry,
    validateResponse: false,
  })
  if (packageMeta.status === 200) return // package already exists
  if (packageMeta.status !== 404) {
    throw new Error(`Failed to check package: ${packageMeta.statusText} ${await packageMeta.text()}`)
  }

  if (!quiet) {
    // eslint-disable-next-line no-console
    console.log('%s does not exist, creating..', name)
  }

  const create = await ffetch(`/api/scopes/${scope}/packages`, {
    baseUrl: registry,
    headers: {
      Cookie: `token=${token}`,
    },
    json: { package: packageName },
    validateResponse: false,
  })

  if (create.status !== 200) {
    const text = await create.text()

    if (create.status === 403) {
      // maybe the scope doesn't exist?
      const json = JSON.parse(text) as Record<string, unknown>
      if (json.code === 'actorNotScopeMember') {
        const info = await jsrGetScopeInfo({ scope, registry }) as unknown

        if (info === null) {
          await jsrCreateScope({ name: scope, registry, token, quiet })
          return jsrMaybeCreatePackage({
            ...params,
            quiet: true,
          })
        }
      }
    }

    throw new Error(`Failed to create package: ${create.statusText} ${text}`)
  }
}

export async function jsrSetGithubRepo(params: {
  registry: string
  name: string
  token: string
  owner: string
  repo: string
}): Promise<void> {
  const {
    registry,
    name,
    token,
    owner,
    repo,
  } = params

  const [scopeWithAt, packageName] = name.split('/')
  if (!packageName || !scopeWithAt || !scopeWithAt.startsWith('@')) {
    throw new Error('Invalid package name')
  }
  const scope = scopeWithAt.slice(1)

  const res = await ffetch(`/api/scopes/${scope}/packages/${packageName}`, {
    method: 'PATCH',
    baseUrl: registry,
    validateResponse: false,
    headers: {
      Cookie: `token=${token}`,
    },
    json: {
      githubRepository: { owner, name: repo },
    },
  })

  if (res.status !== 200) {
    throw new Error(`Failed to set github repo: ${await res.text()}`)
  }
}

import { ffetchBase } from '@fuman/fetch'
import { asyncPool } from '@fuman/utils'
import { z } from 'zod'

export async function createGithubRelease(params: {
  token: string
  repo: string
  tag: string
  name: string
  body: string
  draft?: boolean
  prerelease?: boolean
  artifacts?: {
    name: string
    type: string
    body: Uint8Array
  }[]
  apiUrl?: string
}): Promise<number> {
  const ffetch = ffetchBase.extend({
    baseUrl: params.apiUrl ?? 'https://api.github.com',
    headers: {
      'Accept': 'application/vnd.github+json',
      'User-Agent': '@fuman/build',
      'X-GitHub-Api-Version': '2022-11-28',
      'Authorization': `Bearer ${params.token}`,
    },
  })

  const release = await ffetch.post(`/repos/${params.repo}/releases`, {
    json: {
      tag_name: params.tag,
      name: params.name,
      body: params.body,
      draft: params.draft ?? false,
      prerelease: params.prerelease ?? false,
    },
    validateResponse: res => res.status === 201,
  }).parsedJson(z.object({
    id: z.number(),
    upload_url: z.string(),
  }))

  const uploadUrl = release.upload_url.split('{')[0]

  if (params.artifacts != null && params.artifacts.length > 0) {
    await asyncPool(params.artifacts, async (file) => {
      try {
        await ffetch(uploadUrl, {
          method: 'POST',
          query: { name: file.name },
          headers: {
            'Content-Type': file.type,
            'Content-Length': file.body.length.toString(),
          },
          body: file.body,
          validateResponse: res => res.status === 201,
        })
      } catch (err) {
        throw new Error(`failed to upload artifact: ${file.name}`, { cause: err })
      }
    })
  }

  return release.id
}

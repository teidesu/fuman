import { afterEach, describe, expect, it, vi } from 'vitest'

const mockPost = vi.fn()
const mockRequest = vi.fn()
const mockFfetch = Object.assign(mockRequest, { post: mockPost })

vi.mock('@fuman/fetch', () => ({
  ffetchBase: {
    extend: () => mockFfetch,
  },
}))

const { createGithubRelease } = await import('./github.js')

describe('createGithubRelease', () => {
  afterEach(() => {
    mockPost.mockReset()
    mockRequest.mockReset()
  })

  it('returns the release id when there are no artifacts', async () => {
    mockPost.mockReturnValue({
      parsedJson: async () => ({ id: 42, upload_url: 'https://uploads.example/assets{?name,label}' }),
    })

    const id = await createGithubRelease({
      token: 'tok',
      repo: 'acme/app',
      tag: 'v1.0.0',
      name: 'v1.0.0',
      body: 'notes',
      apiUrl: 'https://api.example',
    })

    expect(id).toBe(42)
    expect(mockPost).toHaveBeenCalledTimes(1)
    expect(mockRequest).not.toHaveBeenCalled()
  })

  it('throws when an artifact upload fails after the release is created', async () => {
    mockPost.mockReturnValue({
      parsedJson: async () => ({ id: 7, upload_url: 'https://uploads.example/assets{?name,label}' }),
    })
    mockRequest.mockRejectedValue(new Error('HTTP Error 500'))

    await expect(
      createGithubRelease({
        token: 'tok',
        repo: 'acme/app',
        tag: 'v1.0.0',
        name: 'v1.0.0',
        body: 'notes',
        apiUrl: 'https://api.example',
        artifacts: [{ name: 'pkg.tgz', type: 'application/gzip', body: new Uint8Array([1, 2, 3]) }],
      }),
    ).rejects.toThrow('failed to upload artifact: pkg.tgz')

    expect(mockPost).toHaveBeenCalledTimes(1)
    expect(mockRequest).toHaveBeenCalledTimes(1)
  })
})

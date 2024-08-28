import type { AsyncResourceContext, AsyncResourceOptions } from './async-resource.js'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { AsyncResource } from './async-resource.js'

let lastCtx: AsyncResourceContext<string> | null = null
const fetcher = vi.fn<AsyncResourceOptions<string>['fetcher']>()
    .mockImplementation(async (ctx) => {
        lastCtx = structuredClone(ctx)
        delete (lastCtx as any).abort
        return {
            data: `hello at ${Date.now()}`,
            expiresIn: 1000,
        }
    })
const currentCtx = () => fetcher.mock.lastCall?.[0] as AsyncResourceContext<string>
const fakePerfNow = vi.fn<typeof performance.now>().mockImplementation(() => Date.now())

describe('AsyncResource', () => {
    beforeAll(() => {
        vi.useFakeTimers()
        vi.stubGlobal('performance', {
            now: fakePerfNow,
        })
    })
    beforeEach(() => {
        fetcher.mockClear()
        lastCtx = null
        vi.setSystemTime(0)
    })

    afterAll(() => {
        vi.useRealTimers()
        vi.unstubAllGlobals()
    })

    it('should fetch data', async () => {
        const resource = new AsyncResource({ fetcher })

        await resource.update()

        expect(resource.getCached()).toBe('hello at 0')
        expect(fetcher).toHaveBeenCalledOnce()
        expect(lastCtx).toEqual({
            current: null,
            currentExpiresAt: 0,
            currentFetchedAt: 0,
            isBackground: false,
        })
        expect(currentCtx()).toEqual({
            abort: expect.any(AbortSignal),
            current: 'hello at 0',
            currentExpiresAt: 1000,
            currentFetchedAt: 0,
            isBackground: false,
        })
    })

    it('should only fetch data once', async () => {
        const resource = new AsyncResource({ fetcher })

        const promise1 = resource.update()
        const promise2 = resource.update()

        await Promise.all([promise1, promise2])

        expect(resource.getCached()).toBe('hello at 0')
        expect(fetcher).toHaveBeenCalledOnce()
    })

    it('should not refetch data if it is still valid', async () => {
        const resource = new AsyncResource({ fetcher })

        await resource.update()

        fetcher.mockClear()
        await resource.update()

        expect(resource.getCached()).toBe('hello at 0')
        expect(await resource.get()).toBe('hello at 0')
        expect(fetcher).not.toHaveBeenCalled()
    })

    it('should refetch data if it is stale', async () => {
        const resource = new AsyncResource({ fetcher })

        await resource.update()

        fetcher.mockClear()
        vi.setSystemTime(1000)
        await resource.update()

        expect(resource.getCached()).toBe('hello at 1000')
        expect(await resource.get()).toBe('hello at 1000')
        expect(fetcher).toHaveBeenCalledOnce()
    })

    it('should automatically refetch data if autoReload is set', async () => {
        const resource = new AsyncResource({
            fetcher,
            autoReload: true,
            autoReloadAfter: 100,
        })

        await resource.update()

        await vi.runOnlyPendingTimersAsync()

        expect(resource.getCached()).toBe('hello at 1100')
        expect(await resource.get()).toBe('hello at 1100')
        expect(fetcher).toHaveBeenCalledTimes(2)
        expect(lastCtx).toEqual({
            current: 'hello at 0',
            currentExpiresAt: 1000,
            currentFetchedAt: 0,
            isBackground: true,
        })

        resource.destroy()
    })

    it('should return stale date if `swr` is enabled', async () => {
        const resource = new AsyncResource({
            fetcher,
            swr: true,
        })

        await resource.update()
        vi.setSystemTime(2000)

        expect(resource.getCached()).toBe('hello at 0')

        fetcher.mockClear()
        const swrRes = await resource.get()

        expect(swrRes).toBe('hello at 0')
        await vi.runOnlyPendingTimersAsync()
        expect(resource.getCached()).toBe('hello at 2000')
        expect(fetcher).toHaveBeenCalledOnce()
    })

    it('should call onError if fetch fails', async () => {
        const onError = vi.fn()
        const resource = new AsyncResource({
            fetcher,
            onError,
        })

        fetcher.mockRejectedValueOnce(new Error('lol'))
        await resource.update()

        expect(onError).toHaveBeenCalledOnce()
        expect(onError).toHaveBeenCalledWith(new Error('lol'), currentCtx())
    })
})

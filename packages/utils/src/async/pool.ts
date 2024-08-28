import type { MaybePromise } from '../types/misc.js'

export interface AsyncPoolOptions<Item> {
    /**
     * Concurrency limit
     *
     * @default  16
     */
    limit?: number

    /** Abort signal */
    signal?: AbortSignal

    /**
     * Customize the behavior when an error is thrown in the iterator.
     *
     * - `ignore` - Ignore the error and continue
     * - `collect` - Collect the error and throw it at the end in an `AggregateError`
     * - `throw` - Throw the error immediately, and stop any other pending tasks
     *
     * @default  `() => 'throw'`
     */
    onError?: (item: Item, index: number, error: unknown) => MaybePromise<'ignore' | 'collect' | 'throw' >
}

class ErrorInfo<Item> {
    constructor(readonly item: Item, readonly index: number, readonly error: unknown) {}
}

export class AggregateError<Item> extends Error {
    constructor(readonly errors: ErrorInfo<Item>[]) {
        super(`AggregateError: ${errors.length} errors`)
    }
}

export async function asyncPool<Item>(
    iterable: Iterable<Item> | AsyncIterable<Item>,
    executor: (item: Item, index: number) => MaybePromise<void>,
    options: AsyncPoolOptions<Item> = {},
): Promise<void> {
    const {
        limit = 16,
        signal,
        onError,
    } = options
    if (limit <= 0) throw new Error('Pool limit must be a positive integer')

    const iteratorFactory = (iterable as AsyncIterable<Item>)[Symbol.asyncIterator] ?? (iterable as Iterable<Item>)[Symbol.iterator]
    if (iteratorFactory === undefined) throw new Error('`iterable` must be an iterable!')
    const iterator = iteratorFactory.call(iterable)

    let idx = 0
    let errored = false
    let ended = false
    const errors: ErrorInfo<Item>[] = []

    if (signal) {
        if (signal.aborted) {
            throw signal.reason
        }
    }

    async function worker() {
        while (true) {
            if (signal?.aborted) throw signal.reason
            if (errored || ended) break

            const result = await iterator.next()
            if (signal?.aborted) throw signal.reason
            if (result.done) {
                ended = true
                break
            }
            if (errored) break

            const thisIdx = idx++
            const item = result.value

            try {
                await executor(item, thisIdx)
            } catch (err) {
                const action = onError?.(item, thisIdx, err) ?? 'throw'
                if (action === 'ignore') {
                    continue
                }

                if (action === 'collect') {
                    errors.push(new ErrorInfo(item, thisIdx, err))
                    continue
                }

                if (action === 'throw') {
                    errored = true
                    throw err
                }
            }
        }
    }

    await Promise.all(Array.from({ length: limit }, worker))

    if (signal?.aborted) throw signal.reason

    if (errors.length > 0) {
        throw new AggregateError(errors)
    }
}

export async function parallelMap<Item, Result>(
    iterable: Iterable<Item> | AsyncIterable<Item>,
    executor: (item: Item, index: number) => MaybePromise<Result>,
    options: AsyncPoolOptions<Item> = {},
): Promise<Result[]> {
    const result: Result[] = []

    if (Array.isArray(iterable)) {
        // pre-allocate the array
        result.length = iterable.length
    }

    await asyncPool(iterable, async (item, index) => {
        const res = await executor(item, index)
        result[index] = res
    }, options)

    return result
}

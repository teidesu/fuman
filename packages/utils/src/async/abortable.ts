/**
 * Race a promise against an abort signal.
 *
 * If the signal is aborted before the promise settles, the returned promise
 * rejects with `signal.reason`, and once the original promise resolves,
 * its value is passed to `cancel` (since the underlying operation itself
 * might not be cancellable, e.g. `Deno.connect`).
 */
export function raceWithAbort<T>(
  promise: Promise<T>,
  signal: AbortSignal | undefined,
  cancel: (value: T) => void,
): Promise<T> {
  if (signal == null) return promise

  if (signal.aborted) {
    promise.then(cancel, () => {})
    return Promise.reject(signal.reason)
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      promise.then(cancel, () => {})
      reject(signal.reason)
    }
    signal.addEventListener('abort', onAbort, { once: true })

    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (err) => {
        signal.removeEventListener('abort', onAbort)
        reject(err)
      },
    )
  })
}

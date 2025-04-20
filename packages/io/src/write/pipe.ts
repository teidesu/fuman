import type { IReadable, IWritable } from '../types.js'

/** pipe the contents of a readable stream (until it ends) into a writable stream */
export async function pipe(into: IWritable, readable: IReadable): Promise<void> {
  const chunk = new Uint8Array(1024 * 32)

  while (true) {
    const nread = await readable.read(chunk)
    if (nread === 0) break

    await into.write(chunk.subarray(0, nread))
  }
}

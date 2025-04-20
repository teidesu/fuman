import type { IClosable, ISyncWritable, IWritable } from '../types.js'

export function fumanSyncWritableToAsync(sync: ISyncWritable): IWritable {
  return {
    async write(bytes: Uint8Array) {
      const buf = sync.writeSync(bytes.length)
      buf.set(bytes)
      sync.disposeWriteSync()
    },
  }
}

export function webWritableToFuman(writable: WritableStream<Uint8Array>): IWritable & IClosable {
  const writer = writable.getWriter()

  return {
    async write(bytes: Uint8Array) {
      await writer.write(bytes)
    },
    close() {
      writer.close().catch(() => {})
    },
  }
}

export function fumanWritableToWeb(writable: IWritable): WritableStream<Uint8Array> {
  return new WritableStream({
    async write(chunk) {
      await writable.write(chunk)
    },
    close() {
      if ('close' in writable) {
        (writable as IClosable).close()
      }
    },
  })
}

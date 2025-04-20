/** A synchronous readable stream */
export interface ISyncReadable {
  /**
   * Read the specified number of bytes from the source
   * and return them as a Uint8Array.
   *
   * **The returned Uint8Array**:
   * - *may* be a view into a larger buffer
   * - is only valid until the next call to `readSync`
   * - may be smaller than the requested number of bytes if the end of the source is reached.
   * > these constraints allow for more efficient zero-copy implementations in many cases
   *
   * @param bytes The number of bytes to read
   * @returns Uint8Array containing the bytes that were read.
   */
  readSync: (bytes: number) => Uint8Array
}

/** A readable stream */
export interface IReadable {
  /**
   * Read data from the underlying source into the provided Uint8Array,
   * up to the length of the array, and return the number of bytes read.
   *
   * If there are no bytes available currently, the implementation is supposed to wait
   * until at least one byte is available, and only then resolve the promise.
   * Resolving the promise with a zero-length Uint8Array is marking the end of the source.
   *
   * @param bytes The number of bytes to read
   * @returns Uint8Array containing the bytes that were read.
   */
  read: (into: Uint8Array) => Promise<number>
}

/** Something that can be closed */
export interface IClosable {
  /**
   * Close the underlying source.
   */
  close: () => void
}

/** A synchronous writable stream */
export interface ISyncWritable {
  /**
   * Write the specified number of bytes to the underlying source.
   *
   * The implementation is supposed to make sure there are at least `bytes` bytes
   * available in the underlying source and return a Uint8Array that can be written to.
   * The returned Uint8Array must be valid at least until the next call to `writeSync`
   * or `disposeWriteSync`.
   *
   * If the caller writes less than `bytes` bytes to the returned Uint8Array,
   * `disposeWriteSync` must be called with the number of bytes that were actually written.
   *
   * @param bytes The number of bytes to write
   * @returns Uint8Array of length `bytes` that can be written to
   */
  writeSync: (bytes: number) => Uint8Array

  /**
   * Explicitly dispose of the buffer that was returned by the last call to `writeSync`.
   *
   * If less than `bytes` bytes were written to the buffer, the number of bytes that were
   * written must be passed as the `written` argument.
   */
  disposeWriteSync: (written?: number) => void
}

/** A writable stream */
export interface IWritable {
  /** Write bytes to the underlying stream, resolving once the write is complete */
  write: (bytes: Uint8Array) => Promise<void>
}

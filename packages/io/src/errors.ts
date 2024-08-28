/**
 * Error thrown when trying to read more bytes than available.
 *
 * The part that was read is available in the `part` property.
 */
export class PartialReadError extends RangeError {
    constructor(readonly part: Uint8Array, expectedLength: number) {
        super(`expected to read ${expectedLength} bytes, but only ${part.length} are available`)
    }
}

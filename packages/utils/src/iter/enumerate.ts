export function enumerate<T>(iterable: Iterable<T>): IterableIterator<[number, T]> {
  const iterator = iterable[Symbol.iterator]()
  let idx = 0

  return {
    [Symbol.iterator]() {
      return this
    },
    next() {
      const res = iterator.next()

      if (res.done) {
        return res
      }

      return {
        done: false,
        value: [idx++, res.value],
      }
    },
  }
}

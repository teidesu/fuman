// this is a hack for CustomMap/CustomSet to gracefully handle new es2024 iterators
// for newer runtimes while still supporting older runtimes and also being type-safe
// this is also why we are using ReturnType<Map<ExternalKey, V>['entries']> instead of IterableIterator<[ExternalKey, V]>
// because the latter does not align with Map#entries under esnext (precisely because of the new iterators)

export function maybeWrapIterator<T>(iter: IterableIterator<T>): IterableIterator<T> {
  if (typeof Iterator !== 'undefined' && 'from' in Iterator) {
    return Iterator.from(iter)
  }

  return iter
}

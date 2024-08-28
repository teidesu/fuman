export function splitOnce(str: string, separator: string): [string, string] {
    const idx = str.indexOf(separator)
    if (idx === -1) {
        throw new Error(`Separator not found: ${separator}`, {
            cause: { str, separator },
        })
    }

    return [str.slice(0, idx), str.slice(idx + separator.length)]
}

export function assertStartsWith(str: string, prefix: string): asserts str is `${typeof prefix}${string}` {
    if (!str.startsWith(prefix)) {
        throw new Error(`String does not start with ${prefix}`, {
            cause: { str, prefix },
        })
    }
}

export function assertEndsWith(str: string, suffix: string): asserts str is `${string}${typeof suffix}` {
    if (!str.endsWith(suffix)) {
        throw new Error(`String does not end with ${suffix}`, {
            cause: { str, suffix },
        })
    }
}

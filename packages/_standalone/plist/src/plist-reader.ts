import type { DOMParser, Element, Node } from '@xmldom/xmldom'
import { base64 } from '@fuman/utils'
import { PlistValue } from './types.js'

function getNextElement(iter: Iterator<Node>): Element | null {
  while (true) {
    const node = iter.next()
    if (node.done) return null
    if (node.value.nodeType === 1) return node.value as Element
  }
}

export function readXmlPlist(
  data: string,
  params?: {
    /**
     * implementation of the DOMParser interface (e.g. `@xmldom/xmldom`)
     *
     * @default globalThis.DOMParser
     */
    DOMParser?: any

    /**
     * in `xml1` plists, uids are serialized as a `<dict>` with a single integer key `CF$UID`.
     * by default, we keep them as is, but you can opt into parsing them into a `PlistValue<'uid'>` instead.
     *
     * @default  false
     */
    parseUid?: boolean
  },
): unknown {
  // <deno-tsignore>
  // eslint-disable-next-line ts/no-unsafe-assignment
  const { DOMParser = globalThis.DOMParser, parseUid = false } = params ?? {}

  // NB: @xmldom/xmldom implements only a subset of the APIs,
  // so to ensure support for it we will use its own typings instead of typescript ones
  // eslint-disable-next-line ts/no-unsafe-call
  const parser = (new DOMParser()) as DOMParser
  const doc = parser.parseFromString(data, 'text/xml')

  const root = doc.getElementsByTagName('plist')[0]
  // eslint-disable-next-line ts/strict-boolean-expressions
  if (!root) throw new Error('<plist> not found, invalid plist?')

  const topObject = root.childNodes.filter(node => node.nodeType === 1)
  if (topObject.length !== 1) throw new Error('expected exactly one top object')

  function parseObject(node: Element): unknown {
    switch (node.tagName) {
      case 'dict': {
        const dict: Record<string | number, unknown> = {}
        const childrenIter = node.childNodes[Symbol.iterator]()

        while (true) {
          const key = getNextElement(childrenIter)
          if (!key) break
          if (key.tagName !== 'key') throw new Error(`expected <key>, got <${key.tagName}>`)

          const keyText = key.textContent ?? ''
          const value = getNextElement(childrenIter)
          if (!value) throw new Error(`value for ${keyText} not found`)
          dict[keyText] = parseObject(value)
        }

        if (parseUid && (typeof dict.CF$UID === 'number' || typeof dict.CF$UID === 'bigint') && Object.keys(dict).length === 1) {
          return new PlistValue('uid', dict.CF$UID)
        }

        return dict
      }
      case 'array': {
        const array: unknown[] = []
        const childrenIter = node.childNodes[Symbol.iterator]()

        while (true) {
          const value = getNextElement(childrenIter)
          if (!value) break
          array.push(parseObject(value))
        }

        return array
      }
      case 'string':
        return node.textContent ?? ''
      case 'data':
        return base64.decode(node.textContent?.trim() ?? '')
      case 'integer': {
        const value = node.textContent?.trim() ?? ''
        const numValue = Number(value)
        if (Number.isNaN(numValue)) throw new Error(`invalid integer: ${value}`)
        if (numValue < Number.MIN_SAFE_INTEGER || numValue > Number.MAX_SAFE_INTEGER) {
          return BigInt(value)
        }
        return numValue
      }
      case 'date': {
        const value = new Date(node.textContent?.trim() ?? '')
        if (Number.isNaN(value.getTime())) throw new Error(`invalid date: ${node.textContent}`)
        return value
      }
      case 'false': return false
      case 'true': return true
      case 'real': return Number(node.textContent?.trim() ?? '')
      default: throw new Error(`unexpected tag: <${node.tagName}>`)
    }
  }

  return parseObject(topObject[0] as Element)
}

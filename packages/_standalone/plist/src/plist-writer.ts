// since plist is a fairly simple xml format, we can avoid the overhead of a full xml serializer and just concatenate strings :>

import { base64 } from '@fuman/utils'
import { PlistValue } from './types.js'

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function writeXmlPlist(data: unknown, options?: {
  /**
   * string to use for indentation
   *
   * @default '\t'
   */
  indent?: string

  /**
   * string to use for line breaks
   *
   * @default '\n'
   */
  lineBreak?: string

  /**
   * some implementations wrap `<data>` base64 strings at a certain length,
   * this option allows you to set that length
   *
   * @default 0 (no wrapping)
   */
  wrapDataAt?: number

  /**
   * whether we should collapse empty tags (e.g. `<dict/>`, <array/>`)
   *
   * @default true
   */
  collapseEmpty?: boolean
}): string {
  const {
    indent: indentStr = '\t',
    lineBreak: lineBreakStr = '\n',
    wrapDataAt = 0,
    collapseEmpty = true,
  } = options ?? {}

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
  ]
  let indent = ''

  const pushIndent = () => { indent += indentStr }
  const popIndent = () => { indent = indent.slice(0, -indentStr.length) }
  const pushLine = (line: string) => { lines.push(indent + line) }

  function writeObject(object: unknown): void {
    switch (typeof object) {
      case 'object': {
        if (object === null) {
          pushLine('<null/>')
        } else if (Array.isArray(object)) {
          if (collapseEmpty && object.length === 0) {
            pushLine('<array/>')
          } else {
            pushLine('<array>')
            pushIndent()
            for (const value of object) {
              writeObject(value)
            }
            popIndent()
            pushLine('</array>')
          }
        } else if (object instanceof Date) {
          pushLine(`<date>${object.toISOString().replace(/\.\d+(Z|\+)$/, '$1')}</date>`)
        } else if (object instanceof PlistValue) {
          switch (object.type) {
            case 'float32':
            case 'float64':
              pushLine(`<real>${object.value}</real>`)
              break
            case 'int':
              pushLine(`<integer>${object.value}</integer>`)
              break
            case 'uid':
              writeObject({ CF$UID: object.value as number })
              break
            case 'ascii':
            case 'utf16':
            case 'utf8':
              pushLine(`<string>${escapeXml(object.value as string)}</string>`)
              break
            default:
              throw new Error(`unexpected type: ${object.type}`)
          }
        } else if (object instanceof Uint8Array) {
          const b64 = base64.encode(object)
          if (wrapDataAt === 0) {
            pushLine(`<data>${b64}</data>`)
          } else {
            const wrapLength = wrapDataAt - indent.replace(/\t/g, '        ').length
            pushLine('<data>')
            for (let i = 0; i < b64.length; i += wrapLength) {
              pushLine(b64.slice(i, i + wrapLength))
            }
            pushLine('</data>')
          }
        } else {
          const keys = Object.keys(object)
          if (collapseEmpty && keys.length === 0) {
            pushLine('<dict/>')
          } else {
            pushLine('<dict>')
            pushIndent()
            for (const key of keys) {
              pushLine(`<key>${escapeXml(key)}</key>`)
              // eslint-disable-next-line ts/no-unsafe-member-access
              writeObject((object as any)[key])
            }
            popIndent()
            pushLine('</dict>')
          }
        }
        break
      }
      case 'string':
        pushLine(`<string>${escapeXml(object)}</string>`)
        break
      case 'number': {
        const element = Number.isInteger(object) ? 'integer' : 'real'
        pushLine(`<${element}>${object}</${element}>`)
        break
      }
      case 'bigint':
        pushLine(`<integer>${object.toString()}</integer>`)
        break
      case 'boolean':
        pushLine(`<${object ? 'true' : 'false'}/>`)
        break
      default:
        throw new Error(`unexpected type: ${typeof object}`)
    }
  }

  writeObject(data)

  lines.push('</plist>')

  return lines.join(lineBreakStr)
}

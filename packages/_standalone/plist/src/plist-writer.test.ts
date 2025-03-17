import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DOMParser } from '@xmldom/xmldom'
import { describe, expect, it } from 'vitest'
import { readXmlPlist } from './plist-reader.js'
import { writeXmlPlist as writeXmlPlist_ } from './plist-writer.js'

function writeXmlPlist(data: unknown, options?: Parameters<typeof writeXmlPlist_>[1]): string {
    return writeXmlPlist_(data, {
        indent: '  ',
        ...options,
    })
}

const FIXTURES_DIR = fileURLToPath(new URL('__fixtures__', import.meta.url))

describe('writeXmlPlist', () => {
    it('empty', () => {
        expect(writeXmlPlist({})).toMatchInlineSnapshot(`
          "<?xml version="1.0" encoding="UTF-8"?>
          <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
          <plist version="1.0">
          <dict/>
          </plist>"
        `)
    })

    it('simple dict', () => {
        expect(writeXmlPlist({ a: 1, b: 2 })).toMatchInlineSnapshot(`
          "<?xml version="1.0" encoding="UTF-8"?>
          <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
          <plist version="1.0">
          <dict>
            <key>a</key>
            <integer>1</integer>
            <key>b</key>
            <integer>2</integer>
          </dict>
          </plist>"
        `)
    })

    it('simple array', () => {
        expect(writeXmlPlist([1, 2, 3])).toMatchInlineSnapshot(`
          "<?xml version="1.0" encoding="UTF-8"?>
          <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
          <plist version="1.0">
          <array>
            <integer>1</integer>
            <integer>2</integer>
            <integer>3</integer>
          </array>
          </plist>"
        `)
    })

    it('plistlib fixture (read then write)', async () => {
        const file = await readFile(join(FIXTURES_DIR, 'plistlib.plist'), 'utf8')
        const dict = readXmlPlist(file, { DOMParser }) as Record<string, unknown>
        expect(writeXmlPlist(dict, {
            indent: '\t',
            wrapDataAt: 76,
        })).toEqual(file.trim())
    })
})

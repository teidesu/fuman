import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DOMParser } from '@xmldom/xmldom'
import { describe, expect, it } from 'vitest'
import { readBinaryPlist } from './bplist-reader.js'
import { nsKeyedUnarchive } from './ns-keyed-unarchiver.js'
import { readXmlPlist } from './plist-reader.js'

const FIXTURES_DIR = fileURLToPath(new URL('__fixtures__', import.meta.url))

describe('nsKeyedUnarchive', () => {
    it('node-bplist-parser fixture', async () => {
        const data = await readFile(join(FIXTURES_DIR, 'uid.bplist'))
        const dict = nsKeyedUnarchive(readBinaryPlist(data))
        expect(dict).toMatchInlineSnapshot(`
          {
            "key1": "obj1",
            "key2": "obj2",
            "key3": "obj3",
          }
        `)
    })

    it('plist-kb fixture', async () => {
        // sourced from https://github.com/libyal/plist-kb/, Apache-2.0 license
        const data = await readFile(join(FIXTURES_DIR, 'plist-kb.bplist'))
        const dict = nsKeyedUnarchive(readBinaryPlist(data))
        expect(dict).toMatchInlineSnapshot(`
          {
            "MyArray": [],
            "MyBool": true,
            "MyData": {
              "data": [
                68,
                65,
                84,
                65,
                10,
              ],
              "type": "Buffer",
            },
            "MyDate": 2024-02-12T17:40:49.000Z,
            "MyDictionary": {},
            "MyFloat": 2.7,
            "MyInteger": 98,
            "MyString": "Some string",
          }
        `)
    })

    it('plist-kb fixture (preseveType)', async () => {
        // this one is interesting because it was generated with extra types in the hierarchy by some python code
        const data = await readFile(join(FIXTURES_DIR, 'plist-kb.bplist'))
        const dict = nsKeyedUnarchive(readBinaryPlist(data), { preserveType: true })
        expect(dict).toMatchInlineSnapshot(`
          KeyedArchiverValue {
            "header": {
              "$classes": [
                "OC_BuiltinPythonDictionary",
                "OC_PythonDictionary",
                "NSMutableDictionary",
                "NSDictionary",
                "NSObject",
              ],
              "$classhints": [
                "OC_PythonDictionary",
                "NSDictionary",
              ],
              "$classname": "OC_BuiltinPythonDictionary",
            },
            "value": {
              "MyArray": KeyedArchiverValue {
                "header": {
                  "$classes": [
                    "OC_BuiltinPythonArray",
                    "OC_PythonArray",
                    "NSMutableArray",
                    "NSArray",
                    "NSObject",
                  ],
                  "$classhints": [
                    "OC_PythonArray",
                    "NSArray",
                  ],
                  "$classname": "OC_BuiltinPythonArray",
                },
                "value": [],
              },
              "MyBool": true,
              "MyData": KeyedArchiverValue {
                "header": {
                  "$classes": [
                    "OC_BuiltinPythonData",
                    "OC_PythonData",
                    "NSMutableData",
                    "NSData",
                    "NSObject",
                  ],
                  "$classhints": [
                    "OC_PythonData",
                    "NSData",
                  ],
                  "$classname": "OC_BuiltinPythonData",
                },
                "value": {
                  "data": [
                    68,
                    65,
                    84,
                    65,
                    10,
                  ],
                  "type": "Buffer",
                },
              },
              "MyDate": KeyedArchiverValue {
                "header": {
                  "$classes": [
                    "OC_BuiltinPythonDate",
                    "OC_PythonDate",
                    "NSDate",
                    "NSObject",
                  ],
                  "$classhints": [
                    "OC_PythonDate",
                    "NSDate",
                  ],
                  "$classname": "OC_BuiltinPythonDate",
                },
                "value": 2024-02-12T17:40:49.000Z,
              },
              "MyDictionary": KeyedArchiverValue {
                "header": {
                  "$classes": [
                    "OC_BuiltinPythonDictionary",
                    "OC_PythonDictionary",
                    "NSMutableDictionary",
                    "NSDictionary",
                    "NSObject",
                  ],
                  "$classhints": [
                    "OC_PythonDictionary",
                    "NSDictionary",
                  ],
                  "$classname": "OC_BuiltinPythonDictionary",
                },
                "value": {},
              },
              "MyFloat": 2.7,
              "MyInteger": 98,
              "MyString": KeyedArchiverValue {
                "header": {
                  "$classes": [
                    "OC_BuiltinPythonUnicode",
                    "OC_PythonUnicode",
                    "NSString",
                    "NSObject",
                  ],
                  "$classhints": [
                    "OC_PythonString",
                    "NSString",
                  ],
                  "$classname": "OC_BuiltinPythonUnicode",
                },
                "value": "Some string",
              },
            },
          }
        `)
    })

    describe('danielpaulus/nskeyedarchiver fixtures', () => {
        // sourced from https://github.com/danielpaulus/nskeyedarchiver, MIT license

        it('arrays', async () => {
            const data = await readFile(join(FIXTURES_DIR, 'nska-arrays.bplist'))
            const dict = nsKeyedUnarchive(readBinaryPlist(data))
            expect(dict).toMatchInlineSnapshot(`
              [
                [
                  1,
                  1,
                  1,
                  1.5,
                  {
                    "data": [
                      97,
                      115,
                      100,
                      102,
                      97,
                      115,
                      100,
                      102,
                      97,
                      100,
                      115,
                      102,
                      97,
                      100,
                      115,
                      102,
                    ],
                    "type": "Buffer",
                  },
                  true,
                  "Hello, World!",
                  "Hello, World!",
                  "Hello, World!",
                  false,
                  false,
                  42,
                ],
                [
                  true,
                  "Hello, World!",
                  42,
                ],
                Set {
                  true,
                },
                Set {
                  42,
                  true,
                  "Hello, World!",
                },
              ]
            `)
        })

        it('dict', async () => {
            const data = await readFile(join(FIXTURES_DIR, 'nska-dict.bplist'))
            const dict = nsKeyedUnarchive(readBinaryPlist(data))
            expect(dict).toMatchInlineSnapshot(`
              [
                {
                  "array": [
                    true,
                    "Hello, World!",
                    42,
                  ],
                  "int": 1,
                  "string": "string",
                },
              ]
            `)
        })

        it('nestedarrays', async () => {
            const data = await readFile(join(FIXTURES_DIR, 'nska-nestedarrays.bplist'))
            const dict = nsKeyedUnarchive(readBinaryPlist(data))
            expect(dict).toMatchInlineSnapshot(`
              [
                [
                  Set {
                    true,
                  },
                  Set {
                    42,
                    true,
                    "Hello, World!",
                  },
                ],
              ]
            `)
        })

        it('onevalue', async () => {
            const data = await readFile(join(FIXTURES_DIR, 'nska-onevalue.bplist'))
            const dict = nsKeyedUnarchive(readBinaryPlist(data))
            expect(dict).toMatchInlineSnapshot(`
              [
                true,
              ]
            `)
        })

        it('primitives', async () => {
            const data = await readFile(join(FIXTURES_DIR, 'nska-primitives.bplist'))
            const dict = nsKeyedUnarchive(readBinaryPlist(data))
            expect(dict).toMatchInlineSnapshot(`
              [
                1,
                1,
                1,
                1.5,
                {
                  "data": [
                    97,
                    115,
                    100,
                    102,
                    97,
                    115,
                    100,
                    102,
                    97,
                    100,
                    115,
                    102,
                    97,
                    100,
                    115,
                    102,
                  ],
                  "type": "Buffer",
                },
                true,
                "Hello, World!",
                "Hello, World!",
                "Hello, World!",
                false,
                false,
                42,
              ]
            `)
        })

        it('missing_archiver', async () => {
            const data = await readFile(join(FIXTURES_DIR, 'nska-missing_archiver.plist'), 'utf8')
            expect(() => nsKeyedUnarchive(readXmlPlist(data, { DOMParser }))).toThrowErrorMatchingInlineSnapshot('[Error: invalid or missing $archiver]')
        })

        it('missing_objects', async () => {
            const data = await readFile(join(FIXTURES_DIR, 'nska-missing_objects.plist'), 'utf8')
            expect(() => nsKeyedUnarchive(readXmlPlist(data, { DOMParser }))).toThrowErrorMatchingInlineSnapshot('[Error: key "$objects" not found in object]')
        })

        it('missing_top', async () => {
            const data = await readFile(join(FIXTURES_DIR, 'nska-missing_top.plist'), 'utf8')
            expect(() => nsKeyedUnarchive(readXmlPlist(data, { DOMParser }))).toThrowErrorMatchingInlineSnapshot('[Error: key "$top" not found in object]')
        })

        it('missing_version', async () => {
            const data = await readFile(join(FIXTURES_DIR, 'nska-missing_version.plist'), 'utf8')
            expect(() => nsKeyedUnarchive(readXmlPlist(data, { DOMParser }))).toThrowErrorMatchingInlineSnapshot('[Error: unsupported NSKeyedArchiver version]')
        })
    })

    it('handles circular references', async () => {
        // <ref *1> {
        //   meow: 123,
        //   purr: <ref *2> [ [Circular *1], [Circular *2] ]
        // }
        const data = await readFile(join(FIXTURES_DIR, 'nska-circular.bplist'))
        const dict = nsKeyedUnarchive(readBinaryPlist(data)) as Record<string, unknown>
        expect(dict.meow).toBe(123)
        expect((dict.purr as unknown[])[0]).toBe(dict)
        expect((dict.purr as unknown[])[1]).toBe(dict.purr)
    })
})

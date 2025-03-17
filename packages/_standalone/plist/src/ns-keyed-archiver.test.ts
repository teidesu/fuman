import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { readBinaryPlist } from './bplist-reader.js'
import { nsKeyedArchive } from './ns-keyed-archiver.js'
import { nsKeyedUnarchive } from './ns-keyed-unarchiver.js'

const FIXTURES_DIR = fileURLToPath(new URL('__fixtures__', import.meta.url))

describe('nsKeyedArchive', () => {
    it('node-bplist-parser fixture', async () => {
        const data = readBinaryPlist(await readFile(join(FIXTURES_DIR, 'uid.bplist')))
        const dict = nsKeyedUnarchive(data, { preserveType: true })
        const archived = nsKeyedArchive(dict)
        expect(archived).toMatchInlineSnapshot(`
          {
            "$archiver": "NSKeyedArchiver",
            "$objects": [
              "$null",
              {
                "$class": PlistValue {
                  "type": "uid",
                  "value": 8,
                },
                "NS.keys": [
                  PlistValue {
                    "type": "uid",
                    "value": 2,
                  },
                  PlistValue {
                    "type": "uid",
                    "value": 4,
                  },
                  PlistValue {
                    "type": "uid",
                    "value": 6,
                  },
                ],
                "NS.objects": [
                  PlistValue {
                    "type": "uid",
                    "value": 3,
                  },
                  PlistValue {
                    "type": "uid",
                    "value": 5,
                  },
                  PlistValue {
                    "type": "uid",
                    "value": 7,
                  },
                ],
              },
              "key1",
              "obj1",
              "key3",
              "obj3",
              "key2",
              "obj2",
              {
                "$classes": [
                  "NSMutableDictionary",
                  "NSDictionary",
                  "NSObject",
                ],
                "$classname": "NSMutableDictionary",
              },
            ],
            "$top": {
              "root": PlistValue {
                "type": "uid",
                "value": 1,
              },
            },
            "$version": 100000,
          }
        `)
    })

    it('plist-kb fixture', async () => {
        // sourced from https://github.com/libyal/plist-kb/, Apache-2.0 license
        const data = await readFile(join(FIXTURES_DIR, 'plist-kb.bplist'))
        const dict = nsKeyedUnarchive(readBinaryPlist(data))
        const archived = nsKeyedArchive(dict)
        expect(archived).toMatchInlineSnapshot(`
          {
            "$archiver": "NSKeyedArchiver",
            "$objects": [
              "$null",
              {
                "$class": PlistValue {
                  "type": "uid",
                  "value": 14,
                },
                "NS.keys": [
                  PlistValue {
                    "type": "uid",
                    "value": 2,
                  },
                  PlistValue {
                    "type": "uid",
                    "value": 5,
                  },
                  PlistValue {
                    "type": "uid",
                    "value": 7,
                  },
                  PlistValue {
                    "type": "uid",
                    "value": 9,
                  },
                  PlistValue {
                    "type": "uid",
                    "value": 12,
                  },
                  PlistValue {
                    "type": "uid",
                    "value": 15,
                  },
                  PlistValue {
                    "type": "uid",
                    "value": 17,
                  },
                  PlistValue {
                    "type": "uid",
                    "value": 19,
                  },
                ],
                "NS.objects": [
                  PlistValue {
                    "type": "uid",
                    "value": 3,
                  },
                  PlistValue {
                    "type": "uid",
                    "value": 6,
                  },
                  PlistValue {
                    "type": "uid",
                    "value": 8,
                  },
                  PlistValue {
                    "type": "uid",
                    "value": 10,
                  },
                  PlistValue {
                    "type": "uid",
                    "value": 13,
                  },
                  PlistValue {
                    "type": "uid",
                    "value": 16,
                  },
                  PlistValue {
                    "type": "uid",
                    "value": 18,
                  },
                  PlistValue {
                    "type": "uid",
                    "value": 20,
                  },
                ],
              },
              "MyArray",
              {
                "$class": PlistValue {
                  "type": "uid",
                  "value": 4,
                },
                "NS.objects": [],
              },
              {
                "$classes": [
                  "NSArray",
                  "NSObject",
                ],
                "$classname": "NSArray",
              },
              "MyBool",
              true,
              "MyData",
              {
                "data": [
                  68,
                  65,
                  84,
                  65,
                  10,
                ],
                "type": "Buffer",
              },
              "MyDate",
              {
                "$class": PlistValue {
                  "type": "uid",
                  "value": 11,
                },
                "NS.time": 729452449,
              },
              {
                "$classes": [
                  "NSDate",
                  "NSObject",
                ],
                "$classname": "NSDate",
              },
              "MyDictionary",
              {
                "$class": PlistValue {
                  "type": "uid",
                  "value": 14,
                },
                "NS.keys": [],
                "NS.objects": [],
              },
              {
                "$classes": [
                  "NSDictionary",
                  "NSObject",
                ],
                "$classname": "NSDictionary",
              },
              "MyFloat",
              2.7,
              "MyInteger",
              98,
              "MyString",
              "Some string",
            ],
            "$top": {
              "root": PlistValue {
                "type": "uid",
                "value": 1,
              },
            },
            "$version": 100000,
          }
        `)
    })

    describe('danielpaulus/nskeyedarchiver fixtures', () => {
        // sourced from https://github.com/danielpaulus/nskeyedarchiver, MIT license

        it('arrays', async () => {
            const data = await readFile(join(FIXTURES_DIR, 'nska-arrays.bplist'))
            const dict = nsKeyedUnarchive(readBinaryPlist(data))
            expect(nsKeyedArchive(dict)).toMatchInlineSnapshot(`
              {
                "$archiver": "NSKeyedArchiver",
                "$objects": [
                  "$null",
                  {
                    "$class": PlistValue {
                      "type": "uid",
                      "value": 9,
                    },
                    "NS.objects": [
                      PlistValue {
                        "type": "uid",
                        "value": 2,
                      },
                      PlistValue {
                        "type": "uid",
                        "value": 2,
                      },
                      PlistValue {
                        "type": "uid",
                        "value": 2,
                      },
                      PlistValue {
                        "type": "uid",
                        "value": 3,
                      },
                      PlistValue {
                        "type": "uid",
                        "value": 4,
                      },
                      PlistValue {
                        "type": "uid",
                        "value": 5,
                      },
                      PlistValue {
                        "type": "uid",
                        "value": 6,
                      },
                      PlistValue {
                        "type": "uid",
                        "value": 6,
                      },
                      PlistValue {
                        "type": "uid",
                        "value": 6,
                      },
                      PlistValue {
                        "type": "uid",
                        "value": 7,
                      },
                      PlistValue {
                        "type": "uid",
                        "value": 7,
                      },
                      PlistValue {
                        "type": "uid",
                        "value": 8,
                      },
                    ],
                  },
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
                  false,
                  42,
                  {
                    "$classes": [
                      "NSArray",
                      "NSObject",
                    ],
                    "$classname": "NSArray",
                  },
                  {
                    "$class": PlistValue {
                      "type": "uid",
                      "value": 9,
                    },
                    "NS.objects": [
                      PlistValue {
                        "type": "uid",
                        "value": 5,
                      },
                      PlistValue {
                        "type": "uid",
                        "value": 6,
                      },
                      PlistValue {
                        "type": "uid",
                        "value": 8,
                      },
                    ],
                  },
                  {
                    "$class": PlistValue {
                      "type": "uid",
                      "value": 9,
                    },
                    "NS.objects": [
                      PlistValue {
                        "type": "uid",
                        "value": 5,
                      },
                    ],
                  },
                  {
                    "$class": PlistValue {
                      "type": "uid",
                      "value": 9,
                    },
                    "NS.objects": [
                      PlistValue {
                        "type": "uid",
                        "value": 8,
                      },
                      PlistValue {
                        "type": "uid",
                        "value": 5,
                      },
                      PlistValue {
                        "type": "uid",
                        "value": 6,
                      },
                    ],
                  },
                ],
                "$top": {
                  "$0": PlistValue {
                    "type": "uid",
                    "value": 1,
                  },
                  "$1": PlistValue {
                    "type": "uid",
                    "value": 10,
                  },
                  "$2": PlistValue {
                    "type": "uid",
                    "value": 11,
                  },
                  "$3": PlistValue {
                    "type": "uid",
                    "value": 12,
                  },
                },
                "$version": 100000,
              }
            `)
        })

        it('dict', async () => {
            const data = await readFile(join(FIXTURES_DIR, 'nska-dict.bplist'))
            const dict = nsKeyedUnarchive(readBinaryPlist(data))
            expect(nsKeyedArchive(dict)).toMatchInlineSnapshot(`
              {
                "$archiver": "NSKeyedArchiver",
                "$objects": [
                  "$null",
                  {
                    "$class": PlistValue {
                      "type": "uid",
                      "value": 11,
                    },
                    "NS.keys": [
                      PlistValue {
                        "type": "uid",
                        "value": 2,
                      },
                      PlistValue {
                        "type": "uid",
                        "value": 4,
                      },
                      PlistValue {
                        "type": "uid",
                        "value": 5,
                      },
                    ],
                    "NS.objects": [
                      PlistValue {
                        "type": "uid",
                        "value": 3,
                      },
                      PlistValue {
                        "type": "uid",
                        "value": 4,
                      },
                      PlistValue {
                        "type": "uid",
                        "value": 6,
                      },
                    ],
                  },
                  "int",
                  1,
                  "string",
                  "array",
                  {
                    "$class": PlistValue {
                      "type": "uid",
                      "value": 10,
                    },
                    "NS.objects": [
                      PlistValue {
                        "type": "uid",
                        "value": 7,
                      },
                      PlistValue {
                        "type": "uid",
                        "value": 8,
                      },
                      PlistValue {
                        "type": "uid",
                        "value": 9,
                      },
                    ],
                  },
                  true,
                  "Hello, World!",
                  42,
                  {
                    "$classes": [
                      "NSArray",
                      "NSObject",
                    ],
                    "$classname": "NSArray",
                  },
                  {
                    "$classes": [
                      "NSDictionary",
                      "NSObject",
                    ],
                    "$classname": "NSDictionary",
                  },
                ],
                "$top": {
                  "$0": PlistValue {
                    "type": "uid",
                    "value": 1,
                  },
                },
                "$version": 100000,
              }
            `)
        })

        it('nestedarrays', async () => {
            const data = await readFile(join(FIXTURES_DIR, 'nska-nestedarrays.bplist'))
            const dict = nsKeyedUnarchive(readBinaryPlist(data))
            expect(nsKeyedArchive(dict)).toMatchInlineSnapshot(`
              {
                "$archiver": "NSKeyedArchiver",
                "$objects": [
                  "$null",
                  {
                    "$class": PlistValue {
                      "type": "uid",
                      "value": 4,
                    },
                    "NS.objects": [
                      PlistValue {
                        "type": "uid",
                        "value": 2,
                      },
                      PlistValue {
                        "type": "uid",
                        "value": 5,
                      },
                    ],
                  },
                  {
                    "$class": PlistValue {
                      "type": "uid",
                      "value": 4,
                    },
                    "NS.objects": [
                      PlistValue {
                        "type": "uid",
                        "value": 3,
                      },
                    ],
                  },
                  true,
                  {
                    "$classes": [
                      "NSArray",
                      "NSObject",
                    ],
                    "$classname": "NSArray",
                  },
                  {
                    "$class": PlistValue {
                      "type": "uid",
                      "value": 4,
                    },
                    "NS.objects": [
                      PlistValue {
                        "type": "uid",
                        "value": 6,
                      },
                      PlistValue {
                        "type": "uid",
                        "value": 3,
                      },
                      PlistValue {
                        "type": "uid",
                        "value": 7,
                      },
                    ],
                  },
                  42,
                  "Hello, World!",
                ],
                "$top": {
                  "$0": PlistValue {
                    "type": "uid",
                    "value": 1,
                  },
                },
                "$version": 100000,
              }
            `)
        })

        it('onevalue', async () => {
            const data = await readFile(join(FIXTURES_DIR, 'nska-onevalue.bplist'))
            const dict = nsKeyedUnarchive(readBinaryPlist(data))
            expect(nsKeyedArchive(dict)).toMatchInlineSnapshot(`
              {
                "$archiver": "NSKeyedArchiver",
                "$objects": [
                  "$null",
                  true,
                ],
                "$top": {
                  "$0": PlistValue {
                    "type": "uid",
                    "value": 1,
                  },
                },
                "$version": 100000,
              }
            `)
        })

        it('primitives', async () => {
            const data = await readFile(join(FIXTURES_DIR, 'nska-primitives.bplist'))
            const dict = nsKeyedUnarchive(readBinaryPlist(data))
            expect(nsKeyedArchive(dict)).toMatchInlineSnapshot(`
              {
                "$archiver": "NSKeyedArchiver",
                "$objects": [
                  "$null",
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
                  false,
                  42,
                ],
                "$top": {
                  "$0": PlistValue {
                    "type": "uid",
                    "value": 1,
                  },
                  "$1": PlistValue {
                    "type": "uid",
                    "value": 1,
                  },
                  "$10": PlistValue {
                    "type": "uid",
                    "value": 6,
                  },
                  "$11": PlistValue {
                    "type": "uid",
                    "value": 7,
                  },
                  "$2": PlistValue {
                    "type": "uid",
                    "value": 1,
                  },
                  "$3": PlistValue {
                    "type": "uid",
                    "value": 2,
                  },
                  "$4": PlistValue {
                    "type": "uid",
                    "value": 3,
                  },
                  "$5": PlistValue {
                    "type": "uid",
                    "value": 4,
                  },
                  "$6": PlistValue {
                    "type": "uid",
                    "value": 5,
                  },
                  "$7": PlistValue {
                    "type": "uid",
                    "value": 5,
                  },
                  "$8": PlistValue {
                    "type": "uid",
                    "value": 5,
                  },
                  "$9": PlistValue {
                    "type": "uid",
                    "value": 6,
                  },
                },
                "$version": 100000,
              }
            `)
        })
    })

    it('handles circular references', async () => {
        // <ref *1> {
        //   meow: 123,
        //   purr: <ref *2> [ [Circular *1], [Circular *2] ]
        // }
        const obj: Record<string, unknown> = {
            meow: 123,
        }
        obj.purr = [obj]
        ;(obj.purr as unknown[]).push(obj.purr)

        expect(nsKeyedArchive(obj)).toMatchInlineSnapshot(`
          {
            "$archiver": "NSKeyedArchiver",
            "$objects": [
              "$null",
              {
                "$class": PlistValue {
                  "type": "uid",
                  "value": 7,
                },
                "NS.keys": [
                  PlistValue {
                    "type": "uid",
                    "value": 2,
                  },
                  PlistValue {
                    "type": "uid",
                    "value": 4,
                  },
                ],
                "NS.objects": [
                  PlistValue {
                    "type": "uid",
                    "value": 3,
                  },
                  PlistValue {
                    "type": "uid",
                    "value": 5,
                  },
                ],
              },
              "meow",
              123,
              "purr",
              {
                "$class": PlistValue {
                  "type": "uid",
                  "value": 6,
                },
                "NS.objects": [
                  PlistValue {
                    "type": "uid",
                    "value": 1,
                  },
                  PlistValue {
                    "type": "uid",
                    "value": 5,
                  },
                ],
              },
              {
                "$classes": [
                  "NSArray",
                  "NSObject",
                ],
                "$classname": "NSArray",
              },
              {
                "$classes": [
                  "NSDictionary",
                  "NSObject",
                ],
                "$classname": "NSDictionary",
              },
            ],
            "$top": {
              "root": PlistValue {
                "type": "uid",
                "value": 1,
              },
            },
            "$version": 100000,
          }
        `)
    })
})

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hex } from '@fuman/utils'
import { describe, expect, it } from 'vitest'
import { readBinaryPlist } from './bplist-reader.js'

const FIXTURES_DIR = fileURLToPath(new URL('__fixtures__', import.meta.url))

describe('readBinaryPlist', () => {
    describe('node-bplist-parser fixtures', () => {
        // sourced from https://github.com/joeferner/node-bplist-parser/tree/master/test, MIT license
        it('iTunes Small', async () => {
            const file = await readFile(join(FIXTURES_DIR, 'iTunes-small.bplist'))
            const dict = readBinaryPlist(file) as Record<string, unknown>
            expect(dict['Application Version']).toBe('9.0.3')
            expect(dict['Library Persistent ID']).toBe('6F81D37F95101437')
        })

        it('sample1', async () => {
            const file = await readFile(join(FIXTURES_DIR, 'sample1.bplist'))
            const dict = readBinaryPlist(file) as Record<string, unknown>
            expect(dict).toMatchInlineSnapshot(`
              {
                "CFBundleDevelopmentRegion": "English",
                "CFBundleIdentifier": "com.apple.dictionary.MySample",
                "CFBundleName": "MyDictionary",
                "CFBundleShortVersionString": "1.0",
                "DCSDictionaryCopyright": "Copyright Â© 2007 Apple Inc.",
                "DCSDictionaryDefaultPrefs": {
                  "display-column": "1",
                  "display-picture": "1",
                  "pronunciation": "0",
                  "version": "1",
                },
                "DCSDictionaryFrontMatterReferenceID": "front_back_matter",
                "DCSDictionaryManufacturerName": "Apple Inc.",
                "DCSDictionaryPrefsHTML": "MyDictionary_prefs.html",
                "DCSDictionaryXSL": "MyDictionary.xsl",
              }
            `)
        })

        it('sample2', async () => {
            const file = await readFile(join(FIXTURES_DIR, 'sample2.bplist'))
            const dict = readBinaryPlist(file) as Record<string, unknown>
            expect(dict).toMatchInlineSnapshot(`
              {
                "OptionsLabel": "Product",
                "PopupMenu": [
                  {
                    "Key": "iPhone",
                    "Title": "iPhone",
                  },
                  {
                    "Key": "iPad",
                    "Title": "iPad",
                  },
                  {
                    "Key": "
                      #import <Cocoa/Cocoa.h>

              #import <MacRuby/MacRuby.h>

              int main(int argc, char *argv[])
              {
                return macruby_main("rb_main.rb", argc, argv);
              }
              ",
                  },
                ],
                "TemplateSelection": {
                  "iPad": "Tab Bar iPad Application",
                  "iPhone": "Tab Bar iPhone Application",
                },
              }
            `)
        })

        it('airplay', async () => {
            const file = await readFile(join(FIXTURES_DIR, 'airplay.bplist'))
            const dict = readBinaryPlist(file) as Record<string, unknown>
            expect(dict).toMatchInlineSnapshot(`
              {
                "duration": 5555.0495,
                "loadedTimeRanges": [
                  {
                    "duration": 5555.0495,
                    "start": 0,
                  },
                ],
                "playbackBufferEmpty": true,
                "playbackBufferFull": false,
                "playbackLikelyToKeepUp": true,
                "position": 4.626998904,
                "rate": 1,
                "readyToPlay": true,
                "seekableTimeRanges": [
                  {
                    "duration": 5555.0495,
                    "start": 0,
                  },
                ],
              }
            `)
        })

        it('utf16', async () => {
            const file = await readFile(join(FIXTURES_DIR, 'utf16.bplist'))
            const dict = readBinaryPlist(file) as Record<string, unknown>
            expect(dict).toMatchInlineSnapshot(`
              {
                "BuildIdentifier": "rc1_build2",
                "BuildMachineOSBuild": "11E53",
                "CFBundleDevelopmentRegion": "en",
                "CFBundleDisplayName": "sellStuff",
                "CFBundleExecutable": "sellStuff",
                "CFBundleIconFile": "icon_57x57.png",
                "CFBundleIconFiles": [
                  "icon_57x57.png",
                  "icon_114x114.png",
                ],
                "CFBundleIdentifier": "com.sellStuff.iphone",
                "CFBundleInfoDictionaryVersion": "6.0",
                "CFBundleName": "sellStuff",
                "CFBundlePackageType": "APPL",
                "CFBundleResourceSpecification": "ResourceRules.plist",
                "CFBundleShortVersionString": "2.6.1",
                "CFBundleSignature": "????",
                "CFBundleSupportedPlatforms": [
                  "iPhoneOS",
                ],
                "CFBundleURLTypes": [
                  {
                    "CFBundleURLSchemes": [
                      "sellStuff",
                      "fb267453465127",
                    ],
                  },
                ],
                "CFBundleVersion": "2.6.1",
                "DTCompiler": "com.apple.compilers.llvm.clang.1_0",
                "DTPlatformBuild": "9B176",
                "DTPlatformName": "iphoneos",
                "DTPlatformVersion": "5.1",
                "DTSDKBuild": "9B176",
                "DTSDKName": "iphoneos5.1",
                "DTXcode": "0432",
                "DTXcodeBuild": "4E2002",
                "DistributionType": "AppStore",
                "MinimumOSVersion": "4.0",
                "NSHumanReadableCopyright": "©2008-2012, sellStuff, Inc.",
                "NSMainNibFile": "MainWindow",
                "UIDeviceFamily": [
                  1,
                ],
                "UIPrerenderedIcon": true,
                "UIRequiresPersistentWiFi": true,
              }
            `)
        })

        it('utf16chinese', async () => {
            const file = await readFile(join(FIXTURES_DIR, 'utf16_chinese.bplist'))
            const dict = readBinaryPlist(file) as Record<string, unknown>
            expect(dict.CFBundleName).toMatchInlineSnapshot('"天翼阅读"')
            expect(dict.CFBundleDisplayName).toMatchInlineSnapshot('"天翼阅读"')
        })

        it('uid', async () => {
            const file = await readFile(join(FIXTURES_DIR, 'uid.bplist'))
            const dict = readBinaryPlist(file) as Record<string, unknown>
            expect(dict).toMatchInlineSnapshot(`
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
                        "value": 3,
                      },
                      PlistValue {
                        "type": "uid",
                        "value": 4,
                      },
                    ],
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
                        "value": 7,
                      },
                    ],
                  },
                  "key1",
                  "key3",
                  "key2",
                  "obj1",
                  "obj3",
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

        it('int64', async () => {
            const file = await readFile(join(FIXTURES_DIR, 'int64.bplist'))
            const dict = readBinaryPlist(file) as Record<string, unknown>
            expect(dict).toMatchInlineSnapshot(`
              {
                "int32item": 1234567890,
                "int32itemsigned": -1234567890n,
                "int64item": 12345678901234567890n,
                "zero": 0,
              }
            `)
        })
    })

    it('plistlib fixture', async () => {
        // sourced from https://github.com/python/cpython/blob/main/Lib/test/test_plistlib.py, PSF license
        const file = await readFile(join(FIXTURES_DIR, 'plistlib.bplist'))
        const dict = readBinaryPlist(file) as Record<string, unknown>
        expect(dict).toMatchInlineSnapshot(`
          {
            "aBigInt": 9223372036854775764n,
            "aBigInt2": 9223372036854775852n,
            "aDate": 2004-10-26T10:33:33.000Z,
            "aDict": {
              "aFalseValue": false,
              "aTrueValue": true,
              "aUnicodeValue": "Mässig, Maß",
              "anotherString": "<hello & 'hi' there!>",
              "deeperDict": {
                "a": 17,
                "b": 32.5,
                "c": [
                  1,
                  2,
                  "text",
                ],
              },
            },
            "aFloat": 0.5,
            "aList": [
              "A",
              "B",
              12,
              32.5,
              [
                1,
                2,
                3,
              ],
            ],
            "aNegativeBigInt": -80000000000n,
            "aNegativeInt": -5n,
            "aString": "Doodah",
            "anEmptyDict": {},
            "anEmptyList": [],
            "anInt": 728,
            "nestedData": [
              {
                "data": [
                  60,
                  108,
                  111,
                  116,
                  115,
                  32,
                  111,
                  102,
                  32,
                  98,
                  105,
                  110,
                  97,
                  114,
                  121,
                  32,
                  103,
                  117,
                  110,
                  107,
                  62,
                  0,
                  1,
                  2,
                  3,
                  60,
                  108,
                  111,
                  116,
                  115,
                  32,
                  111,
                  102,
                  32,
                  98,
                  105,
                  110,
                  97,
                  114,
                  121,
                  32,
                  103,
                  117,
                  110,
                  107,
                  62,
                  0,
                  1,
                  2,
                  3,
                  60,
                  108,
                  111,
                  116,
                  115,
                  32,
                  111,
                  102,
                  32,
                  98,
                  105,
                  110,
                  97,
                  114,
                  121,
                  32,
                  103,
                  117,
                  110,
                  107,
                  62,
                  0,
                  1,
                  2,
                  3,
                  60,
                  108,
                  111,
                  116,
                  115,
                  32,
                  111,
                  102,
                  32,
                  98,
                  105,
                  110,
                  97,
                  114,
                  121,
                  32,
                  103,
                  117,
                  110,
                  107,
                  62,
                  0,
                  1,
                  2,
                  3,
                  60,
                  108,
                  111,
                  116,
                  115,
                  32,
                  111,
                  102,
                  32,
                  98,
                  105,
                  110,
                  97,
                  114,
                  121,
                  32,
                  103,
                  117,
                  110,
                  107,
                  62,
                  0,
                  1,
                  2,
                  3,
                  60,
                  108,
                  111,
                  116,
                  115,
                  32,
                  111,
                  102,
                  32,
                  98,
                  105,
                  110,
                  97,
                  114,
                  121,
                  32,
                  103,
                  117,
                  110,
                  107,
                  62,
                  0,
                  1,
                  2,
                  3,
                  60,
                  108,
                  111,
                  116,
                  115,
                  32,
                  111,
                  102,
                  32,
                  98,
                  105,
                  110,
                  97,
                  114,
                  121,
                  32,
                  103,
                  117,
                  110,
                  107,
                  62,
                  0,
                  1,
                  2,
                  3,
                  60,
                  108,
                  111,
                  116,
                  115,
                  32,
                  111,
                  102,
                  32,
                  98,
                  105,
                  110,
                  97,
                  114,
                  121,
                  32,
                  103,
                  117,
                  110,
                  107,
                  62,
                  0,
                  1,
                  2,
                  3,
                  60,
                  108,
                  111,
                  116,
                  115,
                  32,
                  111,
                  102,
                  32,
                  98,
                  105,
                  110,
                  97,
                  114,
                  121,
                  32,
                  103,
                  117,
                  110,
                  107,
                  62,
                  0,
                  1,
                  2,
                  3,
                  60,
                  108,
                  111,
                  116,
                  115,
                  32,
                  111,
                  102,
                  32,
                  98,
                  105,
                  110,
                  97,
                  114,
                  121,
                  32,
                  103,
                  117,
                  110,
                  107,
                  62,
                  0,
                  1,
                  2,
                  3,
                ],
                "type": "Buffer",
              },
            ],
            "someData": {
              "data": [
                60,
                98,
                105,
                110,
                97,
                114,
                121,
                32,
                103,
                117,
                110,
                107,
                62,
              ],
              "type": "Buffer",
            },
            "someMoreData": {
              "data": [
                60,
                108,
                111,
                116,
                115,
                32,
                111,
                102,
                32,
                98,
                105,
                110,
                97,
                114,
                121,
                32,
                103,
                117,
                110,
                107,
                62,
                0,
                1,
                2,
                3,
                60,
                108,
                111,
                116,
                115,
                32,
                111,
                102,
                32,
                98,
                105,
                110,
                97,
                114,
                121,
                32,
                103,
                117,
                110,
                107,
                62,
                0,
                1,
                2,
                3,
                60,
                108,
                111,
                116,
                115,
                32,
                111,
                102,
                32,
                98,
                105,
                110,
                97,
                114,
                121,
                32,
                103,
                117,
                110,
                107,
                62,
                0,
                1,
                2,
                3,
                60,
                108,
                111,
                116,
                115,
                32,
                111,
                102,
                32,
                98,
                105,
                110,
                97,
                114,
                121,
                32,
                103,
                117,
                110,
                107,
                62,
                0,
                1,
                2,
                3,
                60,
                108,
                111,
                116,
                115,
                32,
                111,
                102,
                32,
                98,
                105,
                110,
                97,
                114,
                121,
                32,
                103,
                117,
                110,
                107,
                62,
                0,
                1,
                2,
                3,
                60,
                108,
                111,
                116,
                115,
                32,
                111,
                102,
                32,
                98,
                105,
                110,
                97,
                114,
                121,
                32,
                103,
                117,
                110,
                107,
                62,
                0,
                1,
                2,
                3,
                60,
                108,
                111,
                116,
                115,
                32,
                111,
                102,
                32,
                98,
                105,
                110,
                97,
                114,
                121,
                32,
                103,
                117,
                110,
                107,
                62,
                0,
                1,
                2,
                3,
                60,
                108,
                111,
                116,
                115,
                32,
                111,
                102,
                32,
                98,
                105,
                110,
                97,
                114,
                121,
                32,
                103,
                117,
                110,
                107,
                62,
                0,
                1,
                2,
                3,
                60,
                108,
                111,
                116,
                115,
                32,
                111,
                102,
                32,
                98,
                105,
                110,
                97,
                114,
                121,
                32,
                103,
                117,
                110,
                107,
                62,
                0,
                1,
                2,
                3,
                60,
                108,
                111,
                116,
                115,
                32,
                111,
                102,
                32,
                98,
                105,
                110,
                97,
                114,
                121,
                32,
                103,
                117,
                110,
                107,
                62,
                0,
                1,
                2,
                3,
              ],
              "type": "Buffer",
            },
            "Åbenraa": "That was a unicode key.",
          }
        `)
    })

    describe('malformed plists', () => {
        it('too short', () => {
            expect(() => readBinaryPlist(new Uint8Array(0))).toThrowErrorMatchingInlineSnapshot('[Error: bplist is too small]')
            expect(() => readBinaryPlist(new Uint8Array(32))).toThrowErrorMatchingInlineSnapshot('[Error: bplist is too small]')
        })

        it('invalid magic', () => {
            expect(
                () => readBinaryPlist(new Uint8Array(64).fill(0x30)),
            ).toThrowErrorMatchingInlineSnapshot('[Error: bplist magic is invalid: 000000]')
        })

        // the following fixtures are taken from https://github.com/python/cpython/blob/main/Lib/test/test_plistlib.py, PSF license
        it('too large offset_table_offset and offset_size = 1', () => {
            expect(() => readBinaryPlist(hex.decode('62706c69737430300008000000000000010100000000000000010000000000000000000000000000002a'))).toThrowErrorMatchingInlineSnapshot('[Error: out of bounds: offset 42 >= 42]')
        })

        it('too large offset_table_offset and nonstandard offset_size', () => {
            expect(() => readBinaryPlist(hex.decode('62706c697374303000000008000000000000030100000000000000010000000000000000000000000000002c'))).toThrowErrorMatchingInlineSnapshot('[Error: invalid int size: 3]')
        })

        it('integer overflow in offset_table_offset', () => {
            expect(() => readBinaryPlist(hex.decode('62706c69737430300008000000000000010100000000000000010000000000000000ffffffffffffffff'))).toThrowErrorMatchingInlineSnapshot('[Error: value is too large: 18446744073709551615]')
        })

        it('too large top_object', () => {
            expect(() => readBinaryPlist(hex.decode('62706c697374303000080000000000000101000000000000000100000000000000010000000000000009'))).toThrowErrorMatchingInlineSnapshot('[Error: object 1 not found]')
        })

        it('integer overflow in top_object', () => {
            expect(() => readBinaryPlist(hex.decode('62706c6973743030000800000000000001010000000000000001ffffffffffffffff0000000000000009'))).toThrowErrorMatchingInlineSnapshot('[Error: value is too large: 18446744073709551615]')
        })

        it('too large num_objects and offset_size = 1', () => {
            expect(() => readBinaryPlist(hex.decode('62706c69737430300008000000000000010100000000000000ff00000000000000000000000000000009'))).toThrowErrorMatchingInlineSnapshot('[Error: out of bounds: offset 42 >= 42]')
        })

        it('too large num_objects and nonstandard offset_size', () => {
            expect(() => readBinaryPlist(hex.decode('62706c697374303000000008000000000000030100000000000000ff00000000000000000000000000000009'))).toThrowErrorMatchingInlineSnapshot('[Error: invalid int size: 3]')
        })

        it('extremely large num_objects (32 bit)', () => {
            expect(() => readBinaryPlist(hex.decode('62706c697374303000080000000000000101000000007fffffff00000000000000000000000000000009'))).toThrowErrorMatchingInlineSnapshot('[Error: MAX_OBJECT_COUNT exceeded]')
        })

        it('extremely large num_objects (64 bit)', () => {
            expect(() => readBinaryPlist(hex.decode('62706c697374303000080000000000000101000000ffffffffff00000000000000000000000000000009'))).toThrowErrorMatchingInlineSnapshot('[Error: MAX_OBJECT_COUNT exceeded]')
        })

        it('integer overflow in num_objects', () => {
            expect(() => readBinaryPlist(hex.decode('62706c697374303000080000000000000101ffffffffffffffff00000000000000000000000000000009'))).toThrowErrorMatchingInlineSnapshot('[Error: value is too large: 18446744073709551615]')
        })

        it('offset_size = 0', () => {
            expect(() => readBinaryPlist(hex.decode('62706c697374303000080000000000000001000000000000000100000000000000000000000000000009'))).toThrowErrorMatchingInlineSnapshot('[Error: invalid int size: 0]')
        })

        it('ref_size = 0', () => {
            expect(() => readBinaryPlist(hex.decode('62706c6973743030a10100080a000000000000010000000000000000020000000000000000000000000000000'))).toThrowErrorMatchingInlineSnapshot('[Error: value is too large: 144115188075855872]')
        })

        it('too large offset', () => {
            expect(() => readBinaryPlist(hex.decode('62706c6973743030002a0000000000000101000000000000000100000000000000000000000000000009'))).toThrowErrorMatchingInlineSnapshot('[Error: out of bounds: offset 42 >= 42]')
        })

        it('integer overflow in offset', () => {
            expect(() => readBinaryPlist(hex.decode('62706c697374303000ffffffffffffffff0000000000000801000000000000000100000000000000000000000000000009'))).toThrowErrorMatchingInlineSnapshot('[Error: value is too large: 18446744073709551615]')
        })

        it('too large array size', () => {
            expect(() => readBinaryPlist(hex.decode('62706c6973743030af0001ff00080c000000000000010100000000000000020000000000000000000000000000000d'))).toThrowErrorMatchingInlineSnapshot('[Error: object 255 not found]')
        })

        it('extremely large array size (32-bit)', () => {
            expect(() => readBinaryPlist(hex.decode('62706c6973743030af027fffffff0100080f0000000000000101000000000000000200000000000000000000000000000010'))).toThrowErrorMatchingInlineSnapshot('[Error: out of bounds: offset 2147483661 >= 50]')
        })

        it('extremely large array size (64-bit)', () => {
            expect(() => readBinaryPlist(hex.decode('62706c6973743030af03000000ffffffffff010008130000000000000101000000000000000200000000000000000000000000000014'))).toThrowErrorMatchingInlineSnapshot('[Error: out of bounds: offset 1099511627793 >= 54]')
        })

        it('integer overflow in array size', () => {
            expect(() => readBinaryPlist(hex.decode('62706c6973743030af03ffffffffffffffff010008130000000000000101000000000000000200000000000000000000000000000014'))).toThrowErrorMatchingInlineSnapshot('[Error: value is too large: 18446744073709551615]')
        })

        it('too large reference index', () => {
            expect(() => readBinaryPlist(hex.decode('62706c6973743030a10200080a000000000000010100000000000000020000000000000000000000000000000'))).toThrowErrorMatchingInlineSnapshot('[Error: value is too large: 72057594037927936]')
        })

        it('integer overflow in reference index', () => {
            expect(() => readBinaryPlist(hex.decode('62706c6973743030a1ffffffffffffffff0008110000000000000108000000000000000200000000000000000000000000000012'))).toThrowErrorMatchingInlineSnapshot('[Error: value is too large: 18446744073709551615]')
        })

        it('too large bytes size', () => {
            expect(() => readBinaryPlist(hex.decode('62706c69737430304f00234108000000000000010100000000000000010000000000000000000000000000000c'))).toThrowErrorMatchingInlineSnapshot('[Error: out of bounds: offset 46 >= 45]')
        })

        it('extremely large bytes size (32-bit)', () => {
            expect(() => readBinaryPlist(hex.decode('62706c69737430304f027fffffff4108000000000000010100000000000000010000000000000000000000000000000f'))).toThrowErrorMatchingInlineSnapshot('[Error: out of bounds: offset 2147483661 >= 48]')
        })

        it('extremely large bytes size (64-bit)', () => {
            expect(() => readBinaryPlist(hex.decode('62706c69737430304f03000000ffffffffff41080000000000000101000000000000000100000000000000000000000000000013'))).toThrowErrorMatchingInlineSnapshot('[Error: out of bounds: offset 1099511627793 >= 52]')
        })

        it('integer overflow in bytes size', () => {
            expect(() => readBinaryPlist(hex.decode('62706c69737430304f03ffffffffffffffff41080000000000000101000000000000000100000000000000000000000000000013'))).toThrowErrorMatchingInlineSnapshot('[Error: value is too large: 18446744073709551615]')
        })

        it('too large ASCII size', () => {
            expect(() => readBinaryPlist(hex.decode('62706c69737430305f00234108000000000000010100000000000000010000000000000000000000000000000c'))).toThrowErrorMatchingInlineSnapshot('[Error: out of bounds: offset 46 >= 45]')
        })

        it('extremely large ASCII size (32-bit)', () => {
            expect(() => readBinaryPlist(hex.decode('62706c69737430305f027fffffff4108000000000000010100000000000000010000000000000000000000000000000f'))).toThrowErrorMatchingInlineSnapshot('[Error: out of bounds: offset 2147483661 >= 48]')
        })

        it('extremely large ASCII size (64-bit)', () => {
            expect(() => readBinaryPlist(hex.decode('62706c69737430305f03000000ffffffffff41080000000000000101000000000000000100000000000000000000000000000013'))).toThrowErrorMatchingInlineSnapshot('[Error: out of bounds: offset 1099511627793 >= 52]')
        })

        it('integer overflow in ASCII size', () => {
            expect(() => readBinaryPlist(hex.decode('62706c69737430305f03ffffffffffffffff41080000000000000101000000000000000100000000000000000000000000000013'))).toThrowErrorMatchingInlineSnapshot('[Error: value is too large: 18446744073709551615]')
        })

        it('too large UTF-16 size', () => {
            expect(() => readBinaryPlist(hex.decode('62706c69737430306f001320ac0008000000000000010100000000000000010000000000000000000000000000000e'))).toThrowErrorMatchingInlineSnapshot('[Error: out of bounds: offset 49 >= 47]')
        })

        it('extremely large UTF-16 size (32-bit)', () => {
            expect(() => readBinaryPlist(hex.decode('62706c69737430306f024fffffff20ac00080000000000000101000000000000000100000000000000000000000000000011'))).toThrowErrorMatchingInlineSnapshot('[Error: out of bounds: offset 2684354572 >= 50]')
        })

        it('extremely large UTF-16 size (64-bit)', () => {
            expect(() => readBinaryPlist(hex.decode('62706c69737430306f03000000ffffffffff20ac00080000000000000101000000000000000100000000000000000000000000000015'))).toThrowErrorMatchingInlineSnapshot('[Error: out of bounds: offset 2199023255568 >= 54]')
        })

        it('integer overflow in UTF-16 size', () => {
            expect(() => readBinaryPlist(hex.decode('62706c69737430306f03ffffffffffffffff20ac00080000000000000101000000000000000100000000000000000000000000000015'))).toThrowErrorMatchingInlineSnapshot('[Error: value is too large: 18446744073709551615]')
        })

        it('invalid UTF-16', () => {
            expect(() => readBinaryPlist(hex.decode('62706c697374303061d80008000000000000010100000000000000010000000000000000000000000000000'))).toThrowErrorMatchingInlineSnapshot('[Error: value is too large: 72057594037927936]')
        })

        it('non-hashable key', () => {
            expect(() => readBinaryPlist(hex.decode('62706c6973743030d10101a0080000000000000010100000000000000020000000000000000000000000000000c'))).toThrowErrorMatchingInlineSnapshot('[Error: value is too large: 1152921504606846976]')
        })
    })
})

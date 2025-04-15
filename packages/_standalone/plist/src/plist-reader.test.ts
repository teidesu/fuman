import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { utf8 } from '@fuman/utils'
import { DOMParser } from '@xmldom/xmldom'
import { describe, expect, it } from 'vitest'
import { readXmlPlist as readXmlPlist_ } from './plist-reader.js'

const FIXTURES_DIR = fileURLToPath(new URL('__fixtures__', import.meta.url))

function readXmlPlist(file: Buffer | string, params?: Parameters<typeof readXmlPlist_>[1]): unknown {
    if (typeof file !== 'string') file = utf8.decoder.decode(file)
    return readXmlPlist_(file, {
        DOMParser,
        ...params,
    })
}

describe('readXmlPlist', () => {
    describe('node-bplist-parser fixtures', () => {
        // sourced from https://github.com/joeferner/node-bplist-parser/tree/master/test, MIT license
        it('iTunes Small', async () => {
            const file = await readFile(join(FIXTURES_DIR, 'iTunes-small.plist'))
            const dict = readXmlPlist(file) as Record<string, unknown>
            expect(dict['Application Version']).toBe('9.0.3')
            expect(dict['Library Persistent ID']).toBe('6F81D37F95101437')
        })

        it('sample1', async () => {
            const file = await readFile(join(FIXTURES_DIR, 'sample1.plist'))
            const dict = readXmlPlist(file) as Record<string, unknown>
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
            const file = await readFile(join(FIXTURES_DIR, 'sample2.plist'))
            const dict = readXmlPlist(file) as Record<string, unknown>
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
            const file = await readFile(join(FIXTURES_DIR, 'airplay.plist'))
            const dict = readXmlPlist(file) as Record<string, unknown>
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
            const file = await readFile(join(FIXTURES_DIR, 'utf16.plist'))
            const dict = readXmlPlist(file) as Record<string, unknown>
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
            const file = await readFile(join(FIXTURES_DIR, 'utf16_chinese.plist'))
            const dict = readXmlPlist(file) as Record<string, unknown>
            expect(dict.CFBundleName).toMatchInlineSnapshot('"天翼阅读"')
            expect(dict.CFBundleDisplayName).toMatchInlineSnapshot('"天翼阅读"')
        })

        it('uid', async () => {
            const file = await readFile(join(FIXTURES_DIR, 'uid.plist'))
            const dict = readXmlPlist(file, { parseUid: true }) as Record<string, unknown>
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
            const file = await readFile(join(FIXTURES_DIR, 'int64.plist'))
            const dict = readXmlPlist(file) as Record<string, unknown>
            expect(dict).toMatchInlineSnapshot(`
              {
                "int32item": 1234567890,
                "int32itemsigned": -1234567890,
                "int64item": 12345678901234567890n,
                "zero": 0,
              }
            `)
        })
    })

    it('plistlib fixture', async () => {
        // sourced from https://github.com/python/cpython/blob/main/Lib/test/test_plistlib.py, PSF license
        const file = await readFile(join(FIXTURES_DIR, 'plistlib.plist'))
        const dict = readXmlPlist(file) as Record<string, unknown>
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
            "aNegativeBigInt": -80000000000,
            "aNegativeInt": -5,
            "aString": "Doodah",
            "anEmptyDict": {},
            "anEmptyList": [],
            "anInt": 728,
            "nestedData": [
              Uint8Array [
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
            ],
            "someData": Uint8Array [
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
            "someMoreData": Uint8Array [
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
            "Åbenraa": "That was a unicode key.",
          }
        `)
    })

    it('funny xml features', async () => {
        const file = await readFile(join(FIXTURES_DIR, 'funny.plist'))
        expect(readXmlPlist(file)).toMatchInlineSnapshot(`
          {
            "A": "&entity;",
            "B": "</string>",
          }
        `)
    })

    describe('malformed plist', async () => {
        it('missing <plist> tag', async () => {
            const file = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<dict>
    <key>CFBundleIdentifier</key>
    <string>com.apple.dictionary.MySample</string>
</dict>`
            expect(() => readXmlPlist(file)).toThrowErrorMatchingInlineSnapshot('[Error: <plist> not found, invalid plist?]')
        })

        it('missing top object', async () => {
            const file = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
</plist>`
            expect(() => readXmlPlist(file)).toThrowErrorMatchingInlineSnapshot('[Error: expected exactly one top object]')
        })

        it('multiple top objects', async () => {
            const file = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
    <dict>
        <key>CFBundleIdentifier</key>
        <string>com.apple.dictionary.MySample</string>
    </dict>
    <dict>
        <key>CFBundleIdentifier</key>
        <string>com.apple.dictionary.MySample</string>
    </dict>
</plist>`
            expect(() => readXmlPlist(file)).toThrowErrorMatchingInlineSnapshot('[Error: expected exactly one top object]')
        })

        it('no value for key', async () => {
            const file = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
    <dict>
        <key>CFBundleIdentifier</key>
    </dict>
</plist>`
            expect(() => readXmlPlist(file)).toThrowErrorMatchingInlineSnapshot('[Error: value for CFBundleIdentifier not found]')
        })
    })
})

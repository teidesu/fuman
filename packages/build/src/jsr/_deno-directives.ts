import { asNonNull } from '@fuman/utils'

export function applyDenoDirectives(code: string): string {
  if (!code.match('<deno-(insert|remove|tsignore)>')) return code

  let insertContent = code.match(/\/\/\s*<deno-insert>(.*?)<\/deno-insert>/s)
  while (insertContent) {
    code = code.slice(0, insertContent.index)
      + insertContent[1].replace(/\/\/\s*/g, '')
      + code.slice(asNonNull(insertContent.index) + insertContent[0].length)

    insertContent = code.match(/\/\/\s*<deno-insert>(.*?)<\/deno-insert>/s)
  }

  let removeContent = code.match(/\/\/\s*<deno-remove>(.*?)<\/deno-remove>/s)
  while (removeContent) {
    code = code.slice(0, removeContent.index) + code.slice(asNonNull(removeContent.index) + removeContent[0].length)

    removeContent = code.match(/\/\/\s*<deno-remove>(.*?)<\/deno-remove>/s)
  }

  let tsIgnoreContent = code.match(/\/\/\s*<deno-tsignore>/)
  while (tsIgnoreContent) {
    code = `${code.slice(0, tsIgnoreContent.index)}/* @ts-ignore */${code.slice(asNonNull(tsIgnoreContent.index) + tsIgnoreContent[0].length)}`

    tsIgnoreContent = code.match(/\/\/\s*<deno-tsignore>/)
  }

  return code
}

import type { FfetchResult } from '../../ffetch.js'
import type { FfetchAddon } from '../types.js'

import type { CallSafeTypeProvider, CallTypeProvider, FfetchParser, FfetchTypeProvider } from './_types.js'

export { FfetchParser, FfetchTypeProvider }

export function parser<TypeProvider extends FfetchTypeProvider>(
  parser: FfetchParser<TypeProvider>,
): FfetchAddon<
        object,
    {
      parsedJson: <Schema>(schema: Schema) => Promise<CallTypeProvider<TypeProvider, Schema>>
      safelyParsedJson: <Schema>(schema: Schema) => Promise<CallSafeTypeProvider<TypeProvider, Schema>>
    }
  > {
  return {
    response: {
      async parsedJson(this: FfetchResult, schema: unknown) {
        return parser.parse(schema, await this.json())
      },
      async safelyParsedJson(this: FfetchResult, schema: unknown) {
        return parser.safeParse(schema, await this.json())
      },
    },
  }
}

import type { FfetchResult } from '../../ffetch.js'
import type { FfetchAddon } from '../types.js'

import type { CallTypeProvider, FfetchParser, FfetchTypeProvider } from './_types.js'

export { FfetchParser, FfetchTypeProvider }

export function parser<TypeProvider extends FfetchTypeProvider>(
    parser: FfetchParser<TypeProvider>,
): FfetchAddon<
        object,
        {
            parsedJson: <Schema>(schema: Schema) => Promise<CallTypeProvider<TypeProvider, Schema>>
        }
    > {
    return {
        response: {
            async parsedJson(this: FfetchResult, schema: unknown) {
                return parser.parse(schema, await this.json())
            },
        },
    }
}

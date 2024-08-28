import * as ipaddr from 'ipaddr.js'
import { bench, describe } from 'vitest'

import * as ip from './v6.js'

describe.each([
    '1:2:3:4:5:6:7:8',
    '1:2::3:4:5',
    '::1',
])('parsing %s', (input) => {
    bench('fuman', () => {
        ip.parseV6(input)
    })

    bench('ipaddr.js', () => {
        ipaddr.IPv6.parse(input)
    })

    bench('URL', () => {
        const _ip = new URL(`http://[${input}]`).hostname
    })
})

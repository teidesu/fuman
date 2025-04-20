import * as ipaddr from 'ipaddr.js'
import { bench, describe } from 'vitest'

import * as ip from './v4.js'

describe.each([
  '1.2.3.4',
  '1.2',
  '134744072',
])('parsing %s', (input) => {
  bench('fuman', () => {
    ip.parseV4(input)
  })

  bench('ipaddr.js', () => {
    ipaddr.IPv4.parse(input)
  })

  bench('URL', () => {
    const _ip = new URL(`http://${input}`).hostname
  })
})

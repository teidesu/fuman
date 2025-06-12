import { describe, expect, it } from 'vitest'

import * as ip from './prettify.js'

describe('prettify', () => {
  it('should correctly prettify ipv4 addresses', () => {
    expect(ip.prettify('0000000000000000000000000000000000000000177.0.0.1')).toBe('127.0.0.1')
    expect(ip.prettify('000177.00000000000000000000000001')).toBe('127.0.0.1')
    expect(ip.prettify('017700000001')).toBe('127.0.0.1')
    expect(ip.prettify('0X7F.1')).toBe('127.0.0.1')
    expect(ip.prettify('0x.0x.0')).toBe('0.0.0.0')
    expect(ip.prettify('0x7F000001')).toBe('127.0.0.1')
    expect(ip.prettify('0xc0.0250.01')).toBe('192.168.0.1')
    expect(ip.prettify('0xffffffff')).toBe('255.255.255.255')
    expect(ip.prettify('1.1')).toBe('1.0.0.1')
    expect(ip.prettify('1.1.1')).toBe('1.1.0.1')
    expect(ip.prettify('1.2.3.4')).toBe('1.2.3.4')
    expect(ip.prettify('127.00000000000000000000000001')).toBe('127.0.0.1')
    expect(ip.prettify('127.0x0000.01')).toBe('127.0.0.1')
    expect(ip.prettify('192.0x00a80001')).toBe('192.168.0.1')
    expect(ip.prettify('192.168.257')).toBe('192.168.1.1')
    expect(ip.prettify('2130706433')).toBe('127.0.0.1')
    expect(ip.prettify('256')).toBe('0.0.1.0')
    expect(ip.prettify('4294967295')).toBe('255.255.255.255')
    expect(ip.prettify('999999999')).toBe('59.154.201.255')

    // WhatWG URL specific
    expect(ip.prettify('1.4.')).toBe('1.0.0.4')
    expect(ip.prettify('1.2.3.4.')).toBe('1.2.3.4')
    expect(ip.prettify('192.168.257.')).toBe('192.168.1.1')
    expect(ip.prettify('0xc0.0250.01.')).toBe('192.168.0.1')
    expect(ip.prettify('999999999.')).toBe('59.154.201.255')
  })

  it('should correctly prettify ipv6 addresses', () => {
    expect(ip.prettify('0000:0000:0000:0000:0000:0000:0000:0000')).toBe('::')
    expect(ip.prettify('0000:0000:0000:0000:0000:0000:0000:0001')).toBe('::1')
    expect(ip.prettify('0:0:0:0:0:0:0:1')).toBe('::1')
    expect(ip.prettify('0:0:0:0:0:0:13.1.68.3')).toBe('::d01:4403')
    expect(ip.prettify('0:0:0:0:0:abcd:1234:5678')).toBe('::abcd:1234:5678')
    expect(ip.prettify('0:1:0:1:0:1:0:1')).toBe('0:1:0:1:0:1:0:1')
    expect(ip.prettify('0::000')).toBe('::')
    expect(ip.prettify('1:0:1:0:1:0:1:0')).toBe('1:0:1:0:1:0:1:0')
    expect(ip.prettify('1:0::')).toBe('1::')
    expect(ip.prettify('1:2:0:0:0:0:0:3')).toBe('1:2::3')
    expect(ip.prettify('1:2:0:0:5:0:0:0')).toBe('1:2:0:0:5::')
    expect(ip.prettify('1:2::3')).toBe('1:2::3')
    expect(ip.prettify('1::0000:0:00:0')).toBe('1::')
    expect(ip.prettify('1::0001:0:00:0:0000:0')).toBe('1:0:1::')
    expect(ip.prettify('1::2')).toBe('1::2')
    expect(ip.prettify('1::fcFC')).toBe('1::fcfc')
    expect(ip.prettify('2001:067c:04e8:f002:0000:0000:0000:000b')).toBe('2001:67c:4e8:f002::b')
    expect(ip.prettify('2001:0:0:1:0:0:1:1')).toBe('2001::1:0:0:1:1')
    expect(ip.prettify('2001:0DB8:0000:0000:0008:0800:200C:417A')).toBe('2001:db8::8:800:200c:417a')
    expect(ip.prettify('2001:0db8:0000:0000:0008:0800:200c:417a')).toBe('2001:db8::8:800:200c:417a')
    expect(ip.prettify('2001::1')).toBe('2001::1')
    expect(ip.prettify('2600::0:00:000:0000:0000')).toBe('2600::')
    expect(ip.prettify('2001:Db8:0:0:8:800:200c:417A')).toBe('2001:db8::8:800:200c:417a')
    expect(ip.prettify('2001:db8:0:1:0:0:0:1')).toBe('2001:db8:0:1::1')
    expect(ip.prettify('2001:db8::8:800:200c:417a')).toBe('2001:db8::8:800:200c:417a')
    expect(ip.prettify('::')).toBe('::')
    expect(ip.prettify('::1')).toBe('::1')
    expect(ip.prettify('::127.0.0.1')).toBe('::7f00:1')
    expect(ip.prettify('FE80:0000:0000:0000:0202:B3FF:FE1E:8329')).toBe('fe80::202:b3ff:fe1e:8329')
    expect(ip.prettify('abcd:1234:5678:0:0:0:0:0')).toBe('abcd:1234:5678::')

    // WhatWG URL doesn't support SIIT prettifying
    expect(ip.prettify('0000:0000:0000:0000:0000:ffff:C000:0280')).toBe('::ffff:c000:280')
    expect(ip.prettify('::192.168.1.1')).toBe('::c0a8:101')
    expect(ip.prettify('::FFFF:192.0.2.128')).toBe('::ffff:c000:280')
  })

  it('should enclose ipv6 addresses into square brackets when using encloseIpv6', () => {
    expect(ip.prettify('::', { encloseIpv6: true })).toBe('[::]')
    expect(ip.prettify('64:FF9b::1.1.1.1', { encloseIpv6: true })).toBe('[64:ff9b::101:101]')

    // Make sure it doesn't strip the first and last characters of IPv4 addresses, when using encloseIpv6
    expect(ip.prettify('1.1.1.1', { encloseIpv6: true })).toBe('1.1.1.1')
  })
})

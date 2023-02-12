/* Copyright (c) 2021 Richard Rodger and other contributors, MIT License */


import { Jsonic, Rule } from '@jsonic/jsonic-next'
import { Hoover } from '../hoover'




describe('hoover', () => {

  test('happy', () => {
    const j = Jsonic.make().use(Hoover)

    expect(j(`'''a'''`)).toEqual('a')
    expect(j(`'''\na\n'''`)).toEqual('a')
    expect(j(`'''  \na\n  '''`)).toEqual('a')
    expect(j(` '''\n a\n '''`)).toEqual('a')
    expect(j(`  '''\n  a\n  '''`)).toEqual('a')
    expect(j(`  '''\na\n  '''`)).toEqual('a')
    expect(j(`  '''\n   a\n  '''`)).toEqual(' a')

  })


  test('double-escape', () => {
    const j = Jsonic.make().use(Hoover, {
      block: {
        "'": {
          open: "'",
          close: "'",
          indent: false,
          trim: false,
          doubleEscape: true,
          lineReplace: ' ',
        }
      }
    })

    expect(j(`'a'`)).toEqual('a')
    expect(j(`'a\nb'`)).toEqual('a b')
    expect(j(`'a''b'`)).toEqual('a\'b')
    expect(j(`'a\\nb'`)).toEqual('a\\nb')

  })


})


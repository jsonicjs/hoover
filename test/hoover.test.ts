/* Copyright (c) 2021 Richard Rodger and other contributors, MIT License */


import { Jsonic, Rule } from 'jsonic'
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

})


/* Copyright (c) 2021 Richard Rodger and other contributors, MIT License */


import { Jsonic } from 'jsonic'
// import { Debug } from '@jsonic/jsonic-next/debug'
import { Hoover } from '../hoover'




describe('hoover', () => {

  test('triplequote', () => {
    const j = Jsonic.make().use(Hoover, {
      block: {
        triplequote: {
          start: {
            fixed: `'''`
          },
          end: {
            fixed: `'''`
          },
        }
      }
    })

    expect(j(`{a:'''x'''}`)).toEqual({ a: 'x' })
    expect(j(`['''x''']`)).toEqual(['x'])
    expect(j(`a:'''x'''`)).toEqual({ a: 'x' })
    expect(j(`a:['''x''']`)).toEqual({ a: ['x'] })
    expect(j(`'''x'''`)).toEqual('x')

    expect(j(`{a:'''\nx\n'''}`)).toEqual({ a: '\nx\n' })
    expect(j(`{a:'''\n\n  x\n\n'''}`)).toEqual({ a: '\n\n  x\n\n' })

    expect(j(`['''\nx\n''']`)).toEqual(['\nx\n'])
    expect(j(`['''\n\n  x\n\n''']`)).toEqual(['\n\n  x\n\n'])

    expect(j(`a:'''\nx\n'''`)).toEqual({ a: '\nx\n' })
    expect(j(`a:'''\n\n  x\n\n'''`)).toEqual({ a: '\n\n  x\n\n' })

    expect(j(`a:['''\nx\n''']`)).toEqual({ a: ['\nx\n'] })
    expect(j(`a:['''\n\n  x\n\n''']`)).toEqual({ a: ['\n\n  x\n\n'] })

    expect(j(`'''\nx\n'''`)).toEqual('\nx\n')
    expect(j(`'''\n\n  x\n\n'''`)).toEqual('\n\n  x\n\n')

    expect(j(`{a:1,b:'x',c:['y'] d:e:'z', \nf:"'''"}`))
      .toEqual({ a: 1, b: 'x', c: ['y'], d: { e: 'z' }, f: "'''" })
  })


  test('endofline', () => {
    const j = Jsonic.make()
      // .use(Debug, { trace: true })
      .use(Hoover, {
        lex: {
          order: 7.5e6 // before text, after string, number
        },
        block: {
          endofline: {
            start: {
              rule: {
                parent: {
                  include: ['pair', 'elem']
                },
              }
            },
            end: {
              fixed: ['\n', '\r\n', '#', ';', ''],
              consume: ['\n', '\r\n'],
            },
            escapeChar: '\\',
            escape: {
              '#': '#',
              ';': ';',
              '\\': '\\',
            },
            trim: true,
          }
        }
      })

    expect(j(`{a:x x\n}`)).toEqual({ a: 'x x' })

    expect(j(`
    a: x x
    `))
      .toEqual({
        a: 'x x'
      })

    // NOTE: does not lex at top level
    expect(j(`x: a#b`)).toEqual({ x: 'a' })
    expect(j(`x:a\\#b`)).toEqual({ x: 'a#b' })

    // NOTE: d:e:'z' will no longer work
    expect(j(`{ a: 1, b: 'x', c: ['y'], \nf: "'''" }`))
      .toEqual({ a: 1, b: 'x', c: ['y'], f: "'''" })
  })




  /*
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
  */

})

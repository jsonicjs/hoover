/* Copyright (c) 2021-2023 Richard Rodger, MIT License */


// TODO: line continuation ("\" at end) should be a feature of standard JSONIC strings


import {
  Jsonic,
  Rule,
  RuleSpec,
  Plugin,
  Config,
  Options,
  Lex,
  Context,
  MakeLexMatcher,
  makeStringMatcher,
} from '@jsonic/jsonic-next'


type HooverOptions = {
  block: {
    [open: string]: {
      open: string
      close: string
      indent: boolean
      trim: boolean
      doubleEscape: boolean
      lineReplace: null | string
    }
  }
}


const Hoover: Plugin = (jsonic: Jsonic, options: HooverOptions) => {

  const { keys, omap, regexp, escre } = jsonic.util

  let makeHooverMatcher: MakeLexMatcher = (_cfg: Config, _opts: Options) => {

    const blockmap = options.block || {}
    const blockopeners = keys(blockmap)

    const opener = 0 < blockopeners.length ? regexp(
      '',
      '^(',
      keys(options.block).map(escre).join('|'),
      ')'
    ) : undefined

    const closermap = omap(blockmap, ([open, block]: [string, any]) =>
      [open, regexp('s', '(.*?)',
        block.doubleEscape ? '(?<!' + escre(block.close) + ')' : '',
        escre(block.close),
        block.doubleEscape ? '(?!' + escre(block.close) + ')' : '',
      )])

    console.log('AAA', opener, closermap)

    return function hooverMatcher(lex: Lex) {
      console.log('QQQ')

      let pnt = lex.pnt
      let fwd = lex.src.substring(pnt.sI)

      let val: any = undefined
      let src: any = undefined

      let opening = opener ? fwd.match(opener) : undefined
      let block: any
      let indent: number = 0

      if (opening) {
        block = blockmap[opening[1]]
        console.log('BBB', opening, block)
      }

      if (block) {
        let closing = fwd.substring(block.open.length).match(closermap[block.open])
        if (closing) {
          val = closing[1]
          src = fwd.substring(0, block.open.length + val.length + block.close.length)

          if (block.doubleEscape) {
            val = val.replace(
              regexp('g', escre(block.close), escre(block.close)), block.close)
          }

          if (null != block.lineReplace) {
            val = val.replace(/\r?\n/g, block.lineReplace)
          }

          console.log('CCC', closing, pnt, 'VAL<' + val + '>', 'SRC<' + src + '>', 'LR[' + block.lineReplace + ']')

        }
      }

      // TODO: slurp to end (whatever end is)


      // if ('FOO' === fwd.substring(0, 3)) {

      if (undefined !== val) {

        if (block) {
          if (block.trim) {
            let starting = val.match(/^\s*\r?\n(.*)/s)
            if (starting) {
              val = starting[1]
            }

            let ending = val.match(/\r?\n\s*$/)
            if (ending) {
              val = val.substring(0, val.length - ending[0].length)
            }
            // console.log('TRIM', val, trimming, endtrim)

          }

          if (block.indent) {
            let bwd = lex.src.substring(0, pnt.sI)
            let indenting = bwd.match(/(^\s+|\n\s+)$/)
            console.log('DDD', bwd, indenting)
            if (indenting) {
              indent = indenting[0].length
            }

            let indenter =
              0 < indent ? regexp('', '^\\s{0,', indent, '}(.*)') : undefined
            console.log('INDENT', indent, indenter)

            console.log('VAL', '<' + val + '>')

            let lines = val.split(/\r?\n/)
            console.log('RAW', lines.map((line: string) => '<' + line + '>'))

            lines = lines
              .map((line: string) =>
                ((indenter ? line.match(indenter) : undefined) || [null, line])[1])

            console.log('LINES', lines.map((line: string) => '<' + line + '>'))

            val = lines.join(val.match(/\r\n/) ? '\r\n' : '\n')

            console.log('VAL', val)
          }
        }



        let tkn = lex.token('#TX', val, src, lex.pnt)
        pnt.sI += src.length

        // TODO: wrong, and rI missing
        pnt.cI += src.length

        console.log('HT', tkn)
        return tkn
      }

      // // Hoover colons are ': ' and ':<newline>'.
      // let colon = fwd.match(/^:( |\r?\n)/)
      // if (colon) {
      //   // NOTE: Don't consume newline! leave it for #IN, so it can match properly.
      //   // Even though the match is <:\n> (say), only move point past the ':'.
      //   // This is unusual - lex matchers normally consume the entire token string.
      //   // (In the case ': ', the space will just get ignored).
      //   let tkn = lex.token('#CL', 1, colon[0], lex.pnt)
      //   pnt.sI += 1

      //   pnt.rI += ' ' != colon[1] ? 1 : 0
      //   pnt.cI += ' ' == colon[1] ? 2 : 0
      //   return tkn
      // }

      // // Indentation is significant. This works because jsonic.lex
      // // inserts the matcher before existing matchers, so
      // // lexer.lineMatcher and lexer.spaceMatcher won't get a chance
      // // to incorrectly match an indent.
      // let spaces = fwd.match(/^\r?\n +/)
      // if (spaces) {
      //   let len = spaces[0].length
      //   let tkn = lex.token('#IN', len, spaces[0], lex.pnt)
      //   pnt.sI += len
      //   pnt.rI += 1
      //   pnt.cI = len
      //   return tkn
      // }

      console.log('ZZZ')
      return undefined
    }
  }

  // let lexers = (jsonic.options.lex as any).match
  // lexers.splice(lexers.indexOf(makeStringMatcher), 0, makeHooverMatcher)

  jsonic.options({
    lex: {
      match: {
        hoover: { order: 5.5e6, make: makeHooverMatcher }
      }
    }
  })
}



function parseToEnd(lex: Lex, spec: any): {
  done: boolean
  val: string
} {
  let valc = []

  let pnt = lex.pnt
  let src = lex.src

  let endchars = spec.endchars
  let endseqs = spec.endseqs

  let sI = pnt.sI // Current point in src
  let rI = pnt.rI // Current row
  let cI = pnt.cI // Current column

  let done = false
  let c: string = ''
  let end = 0
  let m

  top:
  do {
    c = src[sI]

    // Check for end
    if (-1 < (end = endchars.indexOf(c))) {
      let endseqlist = endseqs[end]
      endseqlist = Array.isArray(endseqlist) ? endseqlist : [endseqlist]

      let pI = sI
      let endseq

      endseq:
      for (let esI = 0; esI < endseqlist.length; esI++) {
        endseq = endseqlist[esI]

        let tail = endseq && endseq.tail$ || endseq

        if (undefined === tail) {
          done = true
          break endseq
        }
        else if ('string' === typeof tail &&
          tail === src.substring(sI + 1, sI + 1 + endseq.length)) {
          pI = 1 + endseq.length
          done = true
          break endseq
        }

        // regexp
        else if (tail.exec && (m = tail.exec(src.substring(sI)))) {
          pI = 1 + m[0].length
          done = true
          break endseq
        }
      }

      if (done) {
        if (endseq && false !== endseq.consume$) {
          let esI = sI
          let endI = pI
          for (; esI < endI; esI++) {
            sI++
            cI++
            if ('\n' === src[esI]) {
              rI++
              cI = 0
            }
          }
        }

        break top
      }
    }

    valc.push(c)
    sI++
    cI++
    if ('\n' === c) {
      rI++
      cI = 0
    }
  }
  while (sI <= src.length)

  if (done) {
    pnt.sI = sI
    pnt.rI = rI
    pnt.cI = cI
  }

  return {
    done,
    val: valc.join(''),
  }
}



Hoover.defaults = ({
  block: {

    // TODO: normalize with defaults
    "'''": {
      open: "'''",
      close: "'''",
      indent: true,
      trim: true,
      doubleEscape: false,
      lineReplace: null,
    },

    // TODO: FOR TEST
    // '<<': { close: '>>', indent: false }
  },
} as HooverOptions)


export {
  parseToEnd,
  Hoover,
}

export type {
  HooverOptions,
}

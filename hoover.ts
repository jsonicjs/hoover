/* Copyright (c) 2021 Richard Rodger, MIT License */


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
} from 'jsonic'


type HooverOptions = {
  block: {
    [open: string]: {
      close: string
      indent: boolean
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
      [open, regexp('s', '(.*?)', escre(block.close),
        // TODO: double esc optional
        // '(?!',escre(block.close),')',
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
          console.log('CCC', closing, pnt, 'VAL<' + val + '>', 'SRC<' + src + '>')

        }
      }


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

  let lexers = (jsonic.options.lex as any).match
  lexers.splice(lexers.indexOf(makeStringMatcher), 0, makeHooverMatcher)

  jsonic.options({
    lex: {
      match: lexers
    }
  })

  console.log('LEXERS', jsonic.options.lex)
}


Hoover.defaults = ({
  block: {

    // TODO: normalize with defaults
    "'''": {
      open: "'''",
      close: "'''",
      indent: true,
      trim: true,
    },

    // TODO: FOR TEST
    // '<<': { close: '>>', indent: false }
  },
} as HooverOptions)


export {
  Hoover,
}

export type {
  HooverOptions,
}

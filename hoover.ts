/* Copyright (c) 2021-2023 Richard Rodger, MIT License */

/*
support regexp
indent removal
more rule cases
*/

// TODO: line continuation ("\" at end) should be a feature of standard JSONIC strings

import {
  Jsonic,
  Rule,
  RuleSpec,
  Plugin,
  Config,
  Options,
  Lex,
  Point,
  Context,
  MakeLexMatcher,
  makeStringMatcher,
  makePoint,
  Token,
} from '@jsonic/jsonic-next'

type HooverOptions = {
  block: {
    [name: string]: {
      start?: {
        fixed?: string | string[]
        consume?: null | boolean // explicit false to turn off
      }
      end?: {
        fixed?: string | string[]
        consume?: null | boolean // explicit false to turn off
      }
      escapeChar?: string
      escape?: {
        [char: string]: string
      }
      trim: boolean
    }
  }
  lex?: {
    order?: number
  }
}

const Hoover: Plugin = (jsonic: Jsonic, options: HooverOptions) => {
  const { entries } = jsonic.util

  let makeHooverMatcher: MakeLexMatcher = (_cfg: Config, _opts: Options) => {
    let blocks = entries(options.block).map((entry: any[]) => ({
      name: entry[0],
      ...entry[1],
    }))

    return function hooverMatcher(lex: Lex) {
      for (let block of blocks) {
        // TODO: Point.clone ?
        const hvpnt = makePoint(lex.pnt.len, lex.pnt.sI, lex.pnt.rI, lex.pnt.cI)

        let startResult = matchStart(lex, hvpnt, block)

        if (startResult.match) {
          let result = parseToEnd(lex, hvpnt, block)

          if (result.done) {
            let tkn = lex.token(
              '#HV',
              result.val,
              lex.src.substring(lex.pnt.sI, hvpnt.sI),
              hvpnt
            )

            lex.pnt.sI = hvpnt.sI
            lex.pnt.rI = hvpnt.rI
            lex.pnt.cI = hvpnt.cI

            return tkn
          } else {
            return result.bad || lex.bad('invalid_text', lex.pnt.sI, hvpnt.sI)
          }
        }
      }

      return undefined
    }
  }

  // Create a hoover token
  const HV = jsonic.token('#HV')

  jsonic.options({
    lex: {
      match: {
        hoover: { order: options.lex?.order, make: makeHooverMatcher },
      },
    },
  })

  jsonic.rule('val', (rs) => {
    rs.open({
      s: [HV],
    })
  })
}

function matchStart(
  lex: Lex,
  hvpnt: Point,
  block: any
): {
  match: boolean
  start?: string
} {
  let src = lex.src

  let sI = hvpnt.sI // Current point in src
  let rI = hvpnt.rI // Current row
  let cI = hvpnt.cI // Current column

  let start = block.start || {}
  let rulespec = start.rule || {}
  let matchRule: null | boolean = null

  // NOTE: Default rules:
  // - parent is pair,elem
  // - state is open

  if (rulespec.parent) {
    if (rulespec.parent.include) {
      matchRule =
        rulespec.parent.include.includes(lex.ctx.rule.parent.name) &&
        (null === matchRule ? true : matchRule)
    }
  }
  // else {
  //   matchRule = ['pair', 'elem'].includes(lex.ctx.rule.parent.name) &&
  //     (null === matchRule ? true : matchRule)
  // }

  // '': don't check, 'oc'|'c'|'o' check, default 'o'
  let rulestate = '' === rulespec.state ? '' : rulespec.spec || 'o'
  if (rulestate) {
    matchRule =
      rulestate.includes(lex.ctx.rule.state) &&
      (null === matchRule ? true : matchRule)
  }

  let matchFixed = true
  let fixed = start.fixed
  if (matchRule && null != fixed) {
    matchFixed = false

    fixed = Array.isArray(fixed) ? fixed : [fixed]
    for (let fI = 0; !matchFixed && fI < fixed.length; fI++) {
      if (src.substring(hvpnt.sI).startsWith(fixed[fI])) {
        matchFixed = true

        if (false !== start.consume) {
          let endI = hvpnt.sI + fixed[fI].length
          for (let fsI = hvpnt.sI; fsI < endI; fsI++) {
            sI++
            cI++
            if ('\n' === src[fsI]) {
              rI++
              cI = 0
            }
          }
        }

        break
      }
    }
  }

  if (matchRule && matchFixed) {
    let startsrc = src.substring(hvpnt.sI, sI)

    if (false !== block.trim) {
      startsrc = startsrc.trim()
    }

    hvpnt.sI = sI
    hvpnt.rI = rI
    hvpnt.cI = cI

    return { match: true, start: startsrc }
  } else {
    return { match: false }
  }
}

function parseToEnd(
  lex: Lex,
  hvpnt: Point,
  block: any
): {
  done: boolean
  val: string
  bad?: Token
} {
  let valc = []

  let src = lex.src

  let endspec = block.end
  let fixed: string[] = endspec.fixed
  fixed = 'string' === typeof fixed ? [fixed] : fixed

  let endchars = fixed.map((end) => end[0])
  let endseqs = fixed.map((end) => end.substring(1))

  let escapeChar = block.escapeChar

  let sI = hvpnt.sI // Current point in src
  let rI = hvpnt.rI // Current row
  let cI = hvpnt.cI // Current column

  let done = false
  let c: string = ''
  let endI = sI
  let endCharIndex = 0

  top: do {
    c = src[sI]

    // Check for end
    if (-1 < (endCharIndex = endchars.indexOf(c))) {
      let tail = endseqs[endCharIndex]

      // EOF
      if (undefined === tail || '' === tail) {
        done = true
        break top
      }

      // Match tail
      else if (
        'string' === typeof tail &&
        tail === src.substring(sI + 1, sI + 1 + tail.length)
      ) {
        endI = sI + 1 + tail.length
        done = true
        break top
      }

      // // regexp
      // else if (tail.exec && (m = tail.exec(src.substring(sI)))) {
      //   pI = 1 + m[0].length
      //   done = true
      //   break endseq
      // }
      // }

      // break top
    }

    if (escapeChar === c) {
      let replacement = block.escape[src[sI + 1]]

      if (null != replacement) {
        c = replacement
        sI++
        cI++
      } else {
        return {
          done: false,
          val: '',
          bad: lex.bad('invalid_escape', sI, sI + 1),
        }
      }
    }

    valc.push(c)
    sI++
    cI++
    if ('\n' === c) {
      rI++
      cI = 0
    }
  } while (sI <= src.length)

  if (done) {
    if (false !== endspec.consume) {
      let esI = sI
      for (; esI < endI; esI++) {
        sI++
        cI++
        if ('\n' === src[esI]) {
          rI++
          cI = 0
        }
      }
    }

    hvpnt.sI = sI
    hvpnt.rI = rI
    hvpnt.cI = cI
  }

  return {
    done,
    val: valc.join(''),
  }
}

Hoover.defaults = {
  block: {
    // // TODO: normalize with defaults
    // "'''": {
    //   open: "'''",
    //   close: "'''",
    //   indent: true,
    //   trim: true,
    //   doubleEscape: false,
    //   lineReplace: null,
    // },
    // // TODO: FOR TEST
    // // '<<': { close: '>>', indent: false }
  },
  lex: {
    order: 4.5e6, // before string, number
  },
} as HooverOptions

export { parseToEnd, Hoover }

export type { HooverOptions }

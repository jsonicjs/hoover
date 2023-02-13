"use strict";
/* Copyright (c) 2021-2023 Richard Rodger, MIT License */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Hoover = exports.parseToEnd = void 0;
// TODO: line continuation ("\" at end) should be a feature of standard JSONIC strings
const jsonic_next_1 = require("@jsonic/jsonic-next");
const Hoover = (jsonic, options) => {
    const { entries } = jsonic.util;
    let makeHooverMatcher = (_cfg, _opts) => {
        let blocks = entries(options.block).map((entry) => ({
            name: entry[0],
            ...entry[1]
        }));
        return function hooverMatcher(lex) {
            for (let block of blocks) {
                // TODO: Point.clone ?
                const startpnt = (0, jsonic_next_1.makePoint)(lex.pnt.len, lex.pnt.sI, lex.pnt.rI, lex.pnt.cI);
                let match = matchStart(lex, startpnt, block);
                if (match) {
                    let result = parseToEnd(lex, startpnt, block);
                    if (result.done) {
                        let tkn = lex.token('#HV', result.val, lex.src.substring(lex.pnt.sI, startpnt.sI), startpnt);
                        lex.pnt.sI = startpnt.sI;
                        lex.pnt.rI = startpnt.rI;
                        lex.pnt.cI = startpnt.cI;
                        return tkn;
                    }
                    else {
                        lex.bad('invalid_text', lex.pnt.sI, startpnt.sI);
                    }
                }
            }
            return undefined;
        };
    };
    // Create a hoover token
    const HV = jsonic.token('#HV');
    jsonic.options({
        lex: {
            match: {
                hoover: { order: 7.5e6, make: makeHooverMatcher }
            }
        }
    });
    jsonic.rule('val', (rs) => {
        rs.open({
            s: [HV],
        });
    });
};
exports.Hoover = Hoover;
function matchStart(lex, pnt, spec) {
    let src = lex.src;
    let sI = pnt.sI; // Current point in src
    let rI = pnt.rI; // Current row
    let cI = pnt.cI; // Current column
    let rulespec = spec.start.rule;
    let matchRule = true;
    if (rulespec) {
        matchRule = null;
        if (rulespec.parent) {
            if (rulespec.parent.include) {
                matchRule = rulespec.parent.include.includes(lex.ctx.rule.parent.name) &&
                    (null === matchRule ? true : matchRule);
            }
        }
        // '': don't check, 'oc'|'c'|'o' check, default 'o'
        let rulestate = '' === rulespec.state ? '' : (rulespec.spec || 'o');
        if (rulestate) {
            matchRule = rulestate.includes(lex.ctx.rule.state) &&
                (null === matchRule ? true : matchRule);
        }
    }
    // console.log('HV matchRule', matchRule, lex.ctx.rule.name, lex.ctx.rule.parent.name)
    let matchFixed = true;
    let fixed = spec.start.fixed;
    if (null != fixed) {
        matchFixed = false;
        fixed = Array.isArray(fixed) ? fixed : [fixed];
        for (let fixedStartIndex = 0; !matchFixed && fixedStartIndex < fixed.length; fixedStartIndex++) {
            if (src.substring(pnt.sI).startsWith(fixed[fixedStartIndex])) {
                matchFixed = true;
                if (spec.start.consume) {
                    let endI = pnt.sI + fixed[fixedStartIndex].length;
                    for (let fsI = pnt.sI; fsI < endI; fsI++) {
                        sI++;
                        cI++;
                        if ('\n' === src[fsI]) {
                            rI++;
                            cI = 0;
                        }
                    }
                }
                break;
            }
        }
    }
    // console.log('HV matchFixed', matchFixed)
    if (matchRule && matchFixed) {
        pnt.sI = sI;
        pnt.rI = rI;
        pnt.cI = cI;
        return true;
    }
    else {
        return false;
    }
}
function parseToEnd(lex, pnt, spec) {
    let valc = [];
    let src = lex.src;
    let fixed = spec.end.fixed;
    fixed = 'string' === typeof fixed ? [fixed] : fixed;
    let endchars = fixed.map(end => end[0]);
    let endseqs = fixed.map(end => end.substring(1));
    // console.log('ENDCHARS', endchars)
    // console.log('ENDSEQS', endseqs)
    let sI = pnt.sI; // Current point in src
    let rI = pnt.rI; // Current row
    let cI = pnt.cI; // Current column
    let done = false;
    let c = '';
    let endI = sI;
    let endCharIndex = 0;
    // let m
    top: do {
        c = src[sI];
        // Check for end
        if (-1 < (endCharIndex = endchars.indexOf(c))) {
            let tail = endseqs[endCharIndex];
            // let endseqlist = endseqs[end]
            // endseqlist = Array.isArray(endseqlist) ? endseqlist : [endseqlist]
            // let endseq
            // endseq:
            // for (let esI = 0; esI < endseqlist.length; esI++) {
            //   endseq = endseqlist[esI]
            // let tail = endseq && endseq.tail$ || endseq
            //let tail = endseq
            // EOF
            if (undefined === tail || '' === tail) {
                done = true;
                break top;
            }
            // Match tail
            else if ('string' === typeof tail &&
                tail === src.substring(sI + 1, sI + 1 + tail.length)) {
                endI = sI + 1 + tail.length;
                done = true;
                break top;
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
        valc.push(c);
        sI++;
        cI++;
        if ('\n' === c) {
            rI++;
            cI = 0;
        }
    } while (sI <= src.length);
    if (done) {
        if (spec.end.consume) {
            let esI = sI;
            for (; esI < endI; esI++) {
                sI++;
                cI++;
                if ('\n' === src[esI]) {
                    rI++;
                    cI = 0;
                }
            }
        }
        pnt.sI = sI;
        pnt.rI = rI;
        pnt.cI = cI;
    }
    return {
        done,
        val: valc.join(''),
    };
}
exports.parseToEnd = parseToEnd;
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
};
//# sourceMappingURL=hoover.js.map
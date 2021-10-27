"use strict";
/* Copyright (c) 2021 Richard Rodger, MIT License */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Hoover = void 0;
// TODO: line continuation ("\" at end) should be a feature of standard JSONIC strings
const jsonic_1 = require("jsonic");
const Hoover = (jsonic, options) => {
    const { keys, omap, regexp, escre } = jsonic.util;
    let makeHooverMatcher = (_cfg, _opts) => {
        const blockmap = options.block || {};
        const blockopeners = keys(blockmap);
        const opener = 0 < blockopeners.length ? regexp('', '^(', keys(options.block).map(escre).join('|'), ')') : undefined;
        const closermap = omap(blockmap, ([open, block]) => [open, regexp('s', '(.*?)', escre(block.close))]);
        console.log('AAA', opener, closermap);
        return function hooverMatcher(lex) {
            console.log('QQQ');
            let pnt = lex.pnt;
            let fwd = lex.src.substring(pnt.sI);
            let val = undefined;
            let src = undefined;
            let opening = opener ? fwd.match(opener) : undefined;
            let block;
            let indent = 0;
            if (opening) {
                block = blockmap[opening[1]];
                console.log('BBB', opening, block);
            }
            if (block) {
                let closing = fwd.substring(block.open.length).match(closermap[block.open]);
                if (closing) {
                    val = closing[1];
                    src = fwd.substring(0, block.open.length + val.length + block.close.length);
                    console.log('CCC', closing, pnt, 'VAL<' + val + '>', 'SRC<' + src + '>');
                }
            }
            // if ('FOO' === fwd.substring(0, 3)) {
            if (undefined !== val) {
                if (block) {
                    if (block.trim) {
                        let starting = val.match(/^\s*\r?\n(.*)/s);
                        if (starting) {
                            val = starting[1];
                        }
                        let ending = val.match(/\r?\n\s*$/);
                        if (ending) {
                            val = val.substring(0, val.length - ending[0].length);
                        }
                        // console.log('TRIM', val, trimming, endtrim)
                    }
                    if (block.indent) {
                        let bwd = lex.src.substring(0, pnt.sI);
                        let indenting = bwd.match(/(^\s+|\n\s+)$/);
                        console.log('DDD', bwd, indenting);
                        if (indenting) {
                            indent = indenting[0].length;
                        }
                        let indenter = 0 < indent ? regexp('', '^\\s{0,', indent, '}(.*)') : undefined;
                        console.log('INDENT', indent, indenter);
                        console.log('VAL', '<' + val + '>');
                        let lines = val.split(/\r?\n/);
                        console.log('RAW', lines.map((line) => '<' + line + '>'));
                        lines = lines
                            .map((line) => ((indenter ? line.match(indenter) : undefined) || [null, line])[1]);
                        console.log('LINES', lines.map((line) => '<' + line + '>'));
                        val = lines.join(val.match(/\r\n/) ? '\r\n' : '\n');
                        console.log('VAL', val);
                    }
                }
                let tkn = lex.token('#TX', val, src, lex.pnt);
                pnt.sI += src.length;
                // TODO: wrong, and rI missing
                pnt.cI += src.length;
                console.log('HT', tkn);
                return tkn;
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
            console.log('ZZZ');
            return undefined;
        };
    };
    let lexers = jsonic.options.lex.match;
    lexers.splice(lexers.indexOf(jsonic_1.makeStringMatcher), 0, makeHooverMatcher);
    jsonic.options({
        lex: {
            match: lexers
        }
    });
    console.log('LEXERS', jsonic.options.lex);
};
exports.Hoover = Hoover;
Hoover.defaults = {
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
};
//# sourceMappingURL=hoover.js.map
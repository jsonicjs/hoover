"use strict";
/* Copyright (c) 2021 Richard Rodger and other contributors, MIT License */
Object.defineProperty(exports, "__esModule", { value: true });
const jsonic_next_1 = require("@jsonic/jsonic-next");
const hoover_1 = require("../hoover");
describe('hoover', () => {
    test('happy', () => {
        const j = jsonic_next_1.Jsonic.make().use(hoover_1.Hoover);
        expect(j(`'''a'''`)).toEqual('a');
        expect(j(`'''\na\n'''`)).toEqual('a');
        expect(j(`'''  \na\n  '''`)).toEqual('a');
        expect(j(` '''\n a\n '''`)).toEqual('a');
        expect(j(`  '''\n  a\n  '''`)).toEqual('a');
        expect(j(`  '''\na\n  '''`)).toEqual('a');
        expect(j(`  '''\n   a\n  '''`)).toEqual(' a');
    });
    test('double-escape', () => {
        const j = jsonic_next_1.Jsonic.make().use(hoover_1.Hoover, {
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
        });
        expect(j(`'a'`)).toEqual('a');
        expect(j(`'a\nb'`)).toEqual('a b');
        expect(j(`'a''b'`)).toEqual('a\'b');
        expect(j(`'a\\nb'`)).toEqual('a\\nb');
    });
});
//# sourceMappingURL=hoover.test.js.map
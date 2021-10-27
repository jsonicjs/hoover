"use strict";
/* Copyright (c) 2021 Richard Rodger and other contributors, MIT License */
Object.defineProperty(exports, "__esModule", { value: true });
const jsonic_1 = require("jsonic");
const hoover_1 = require("../hoover");
describe('hoover', () => {
    test('happy', () => {
        const j = jsonic_1.Jsonic.make().use(hoover_1.Hoover);
        expect(j(`'''a'''`)).toEqual('a');
        expect(j(`'''\na\n'''`)).toEqual('a');
        expect(j(`'''  \na\n  '''`)).toEqual('a');
        expect(j(` '''\n a\n '''`)).toEqual('a');
        expect(j(`  '''\n  a\n  '''`)).toEqual('a');
        expect(j(`  '''\na\n  '''`)).toEqual('a');
        expect(j(`  '''\n   a\n  '''`)).toEqual(' a');
    });
});
//# sourceMappingURL=hoover.test.js.map
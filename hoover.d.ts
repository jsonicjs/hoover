import { Plugin, Lex, Point } from '@jsonic/jsonic-next';
type HooverOptions = {
    block: {
        [name: string]: any;
    };
};
declare const Hoover: Plugin;
declare function parseToEnd(lex: Lex, pnt: Point, spec: any): {
    done: boolean;
    val: string;
};
export { parseToEnd, Hoover, };
export type { HooverOptions, };

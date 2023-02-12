import { Plugin, Lex } from '@jsonic/jsonic-next';
type HooverOptions = {
    block: {
        [open: string]: {
            open: string;
            close: string;
            indent: boolean;
            trim: boolean;
            doubleEscape: boolean;
            lineReplace: null | string;
        };
    };
};
declare const Hoover: Plugin;
declare function parseToEnd(lex: Lex, spec: any): {
    done: boolean;
    val: string;
};
export { parseToEnd, Hoover, };
export type { HooverOptions, };

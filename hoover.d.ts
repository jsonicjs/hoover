import { Plugin, Lex, Point, Token } from '@jsonic/jsonic-next';
type HooverOptions = {
    block: {
        [name: string]: {
            start?: {
                fixed?: string | string[];
                consume?: null | boolean;
            };
            end?: {
                fixed?: string | string[];
                consume?: null | boolean;
            };
            escapeChar?: string;
            escape?: {
                [char: string]: string;
            };
            trim: boolean;
        };
    };
    lex?: {
        order?: number;
    };
};
declare const Hoover: Plugin;
declare function parseToEnd(lex: Lex, hvpnt: Point, block: any): {
    done: boolean;
    val: string;
    bad?: Token;
};
export { parseToEnd, Hoover };
export type { HooverOptions };

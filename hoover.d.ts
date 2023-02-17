import { Plugin, Config, Lex, Point, Token, AltAction } from '@jsonic/jsonic-next';
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
            allowUnknownEscape: boolean;
            preserveEscapeChar: boolean;
            trim: boolean;
        };
    };
    lex?: {
        order?: number;
    };
    action?: AltAction;
};
declare const Hoover: Plugin;
declare function parseToEnd(lex: Lex, hvpnt: Point, block: any, cfg: Config): {
    done: boolean;
    val: string;
    bad?: Token;
};
export { parseToEnd, Hoover };
export type { HooverOptions };

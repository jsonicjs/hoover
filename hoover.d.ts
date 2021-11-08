import { Plugin } from 'jsonic';
declare type HooverOptions = {
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
export { Hoover, };
export type { HooverOptions, };

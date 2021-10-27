import { Plugin } from 'jsonic';
declare type HooverOptions = {
    block: {
        [open: string]: {
            close: string;
            indent: boolean;
        };
    };
};
declare const Hoover: Plugin;
export { Hoover, };
export type { HooverOptions, };

declare const _exports: {
    errorHandler: typeof errorHandler;
};
export = _exports;
/**
 * Centralized Error Handling Middleware
 */
declare function errorHandler(err: any, req: any, res: any, next: any): any;

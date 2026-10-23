declare const _exports: {
    getDB: typeof getDB;
    initDB: typeof initDB;
    isPostgres: () => boolean;
};
export = _exports;
declare function getDB(): Promise<any>;
declare function initDB(): Promise<any>;

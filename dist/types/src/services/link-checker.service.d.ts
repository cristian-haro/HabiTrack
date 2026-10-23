/**
 * Service to check if real estate listings (Idealista, Fotocasa, Habitaclia, etc.)
 * are still active or have been delisted / deactivated.
 */
declare const _exports: {
    checkPropertyLink: typeof checkPropertyLink;
    DELISTED_PATTERNS: RegExp[];
};
export = _exports;
/**
 * Check a property URL's health & availability status
 * @param {string} url - Target property listing URL
 * @returns {Promise<{active: boolean, status: string, httpCode: number, message: string, checkedAt: string}>}
 */
declare function checkPropertyLink(url: string): Promise<{
    active: boolean;
    status: string;
    httpCode: number;
    message: string;
    checkedAt: string;
}>;

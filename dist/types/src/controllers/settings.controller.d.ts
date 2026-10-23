declare const _exports: {
    getSettings: typeof getSettings;
    saveSettings: typeof saveSettings;
    calculate: typeof calculate;
};
export = _exports;
/**
 * Get user calculator settings
 */
declare function getSettings(req: any, res: any, next: any): Promise<any>;
/**
 * Save user calculator settings
 */
declare function saveSettings(req: any, res: any, next: any): Promise<void>;
/**
 * Standalone calculation endpoint (allows testing / client calculations without local code)
 */
declare function calculate(req: any, res: any, next: any): Promise<void>;

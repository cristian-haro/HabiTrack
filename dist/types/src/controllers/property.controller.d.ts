declare const _exports: {
    getAllProperties: typeof getAllProperties;
    getPropertyById: typeof getPropertyById;
    createProperty: typeof createProperty;
    updateProperty: typeof updateProperty;
    deleteProperty: typeof deleteProperty;
    verifyPropertyLinkById: typeof verifyPropertyLinkById;
    verifyAllPropertiesLinks: typeof verifyAllPropertiesLinks;
    analyzeUrl: typeof analyzeUrl;
};
export = _exports;
/**
 * Get all properties belonging to the authenticated user
 */
/**
 * Get all properties belonging to the authenticated user or their active workspace
 */
declare function getAllProperties(req: any, res: any, next: any): Promise<void>;
/**
 * Get a single property by ID
 */
declare function getPropertyById(req: any, res: any, next: any): Promise<any>;
/**
 * Create or update (if same URL exists) a property for authenticated user
 */
declare function createProperty(req: any, res: any, next: any): Promise<any>;
/**
 * Update an existing property by ID
 */
declare function updateProperty(req: any, res: any, next: any): Promise<any>;
/**
 * Delete a property by ID
 */
declare function deleteProperty(req: any, res: any, next: any): Promise<any>;
/**
 * Verify a single property's link status
 */
declare function verifyPropertyLinkById(req: any, res: any, next: any): Promise<any>;
/**
 * Verify all user's properties links concurrently
 */
declare function verifyAllPropertiesLinks(req: any, res: any, next: any): Promise<void>;
/**
 * Scrape and analyze real estate URL
 */
declare function analyzeUrl(req: any, res: any, next: any): Promise<void>;

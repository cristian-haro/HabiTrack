declare const _exports: {
    listWorkspaces: typeof listWorkspaces;
    createWorkspace: typeof createWorkspace;
    joinWorkspace: typeof joinWorkspace;
    getWorkspaceDetails: typeof getWorkspaceDetails;
    leaveWorkspace: typeof leaveWorkspace;
};
export = _exports;
/**
 * List all workspaces the authenticated user belongs to
 */
declare function listWorkspaces(req: any, res: any, next: any): Promise<void>;
/**
 * Create a new shared workspace
 */
declare function createWorkspace(req: any, res: any, next: any): Promise<any>;
/**
 * Join a workspace via invite code
 */
declare function joinWorkspace(req: any, res: any, next: any): Promise<any>;
/**
 * Get workspace details and members list
 */
declare function getWorkspaceDetails(req: any, res: any, next: any): Promise<any>;
/**
 * Leave a workspace
 */
declare function leaveWorkspace(req: any, res: any, next: any): Promise<any>;

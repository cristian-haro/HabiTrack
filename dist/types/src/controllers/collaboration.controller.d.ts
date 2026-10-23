declare const _exports: {
    voteProperty: typeof voteProperty;
    getPropertyVotes: typeof getPropertyVotes;
    addPropertyComment: typeof addPropertyComment;
    getPropertyComments: typeof getPropertyComments;
    deletePropertyComment: typeof deletePropertyComment;
};
export = _exports;
/**
 * Vote on a property ('like', 'maybe', 'dislike')
 */
declare function voteProperty(req: any, res: any, next: any): Promise<any>;
/**
 * Get all votes for a property
 */
declare function getPropertyVotes(req: any, res: any, next: any): Promise<void>;
/**
 * Add a comment / visit note to a property
 */
declare function addPropertyComment(req: any, res: any, next: any): Promise<any>;
/**
 * Get all comments for a property
 */
declare function getPropertyComments(req: any, res: any, next: any): Promise<void>;
/**
 * Delete a comment (author only or workspace owner)
 */
declare function deletePropertyComment(req: any, res: any, next: any): Promise<any>;

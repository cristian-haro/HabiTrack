declare const _exports: {
    sendOtp: typeof sendOtp;
    verifyOtp: typeof verifyOtp;
    getMe: typeof getMe;
};
export = _exports;
/**
 * Request a 6-digit OTP login code sent by email
 */
declare function sendOtp(req: any, res: any, next: any): Promise<any>;
/**
 * Verify OTP code and issue a JWT token
 */
declare function verifyOtp(req: any, res: any, next: any): Promise<any>;
/**
 * Return authenticated user profile
 */
declare function getMe(req: any, res: any): Promise<void>;

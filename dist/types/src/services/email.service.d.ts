declare const _exports: {
    sendOTPEmail: typeof sendOTPEmail;
};
export = _exports;
/**
 * Send OTP access code email via SMTP using Nodemailer
 * @param {string} toEmail
 * @param {string} otpCode
 */
declare function sendOTPEmail(toEmail: string, otpCode: string): Promise<{
    sent: boolean;
    mocked: boolean;
    reason?: undefined;
    error?: undefined;
} | {
    mocked?: undefined;
    sent: boolean;
    reason: string;
    error?: undefined;
} | {
    mocked?: undefined;
    reason?: undefined;
    sent: boolean;
    error?: undefined;
} | {
    mocked?: undefined;
    reason?: undefined;
    sent: boolean;
    error: any;
}>;

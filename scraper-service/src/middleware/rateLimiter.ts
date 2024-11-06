import rateLimit from 'express-rate-limit';

const whitelist = [
    '71.191.12.123',          // localhost
    'antiballsniffer.club'  // your website
];

export const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later',
    skip: (req) => {
        const clientIP = req.ip;
        const origin = req.get('origin');
        // Skip rate limiting for whitelisted IPs
        if (clientIP && whitelist.includes(clientIP)) {
            return true;
        }

        // Skip rate limiting for your website
        if (origin && (origin.includes('localhost') || origin.includes('antiballsniffer.club'))) {
            return true;
        }

        return false;
    }
}); 
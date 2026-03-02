import * as crypto from 'crypto-js';

export function validateInitData(
    initData: string,
    botToken: string,
    expiresInSeconds: number = 300 // 5 minutes default TTL
): { isValid: boolean; user?: any } {
    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        const authDate = urlParams.get('auth_date');

        if (!hash || !authDate) {
            return { isValid: false };
        }

        // Check expiration (anti-replay attack)
        const now = Math.floor(Date.now() / 1000);
        const authTime = parseInt(authDate, 10);
        if (now - authTime > expiresInSeconds) {
            return { isValid: false }; // Expired
        }

        // Sort parameters alphabetically
        const paramsList: string[] = [];
        urlParams.sort();
        urlParams.forEach((value, key) => {
            if (key !== 'hash') {
                paramsList.push(`${key}=${value}`);
            }
        });
        const dataCheckString = paramsList.join('\n');

        // Create Secret Key
        const secretKey = crypto.HmacSHA256(botToken, 'WebAppData');

        // Hash the DataCheckString
        const calculatedHash = crypto.HmacSHA256(dataCheckString, secretKey).toString(crypto.enc.Hex);

        if (calculatedHash === hash) {
            const userParam = urlParams.get('user');
            const user = userParam ? JSON.parse(decodeURIComponent(userParam)) : undefined;
            return { isValid: true, user };
        }

        return { isValid: false };
    } catch (err) {
        return { isValid: false };
    }
}

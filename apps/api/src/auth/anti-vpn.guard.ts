import { CanActivate, ExecutionContext, Injectable, ForbiddenException, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AntiVpnGuard implements CanActivate {
    private readonly logger = new Logger(AntiVpnGuard.name);

    // Use proxycheck.io API key from env
    private readonly proxyCheckApiKey = process.env.PROXYCHECK_API_KEY || '';

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const ip = request.ip || request.connection.remoteAddress;

        // Skip VPN check on local dev
        if (process.env.NODE_ENV === 'development') {
            return true;
        }

        try {
            // Using Proxycheck.io as an example Anti-VPN lookup
            const response = await axios.get(`http://proxycheck.io/v2/${ip}`, {
                params: { key: this.proxyCheckApiKey, vpn: 1 }
            });

            const result = response.data[ip];

            if (result && result.proxy === "yes") {
                this.logger.warn(`VPN/Proxy detected for IP: ${ip} targeting ${request.url}`);
                // Immediately block with 403 Forbidden
                throw new ForbiddenException('Tolong matikan VPN/Proxy Anda untuk mengakses layanan.');
            }

            return true;
        } catch (error) {
            if (error instanceof ForbiddenException) throw error;

            // Fallback open if proxycheck api fails (so we don't accidentally block legit users)
            this.logger.error('Failed to connect to Anti-VPN provider', error.message);
            return true;
        }
    }
}

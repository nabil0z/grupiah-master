import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { BroadcastCronService } from './src/broadcast/broadcast-cron.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const cronService = app.get(BroadcastCronService);
    const logger = new Logger('TestImage');

    logger.log('Manually invoking rotateAndBroadcast for testing...');

    // Set the clock to 09:00 artificially for the test context by overriding
    // the method temporarily or we'll just expose a test method on the service.
    // Using an "any" cast to access private methods for tests.

    try {
        const offerImg = await (cronService as any).generateImageFromHtml('offer', {
            title: `APP INSTALL<br/>REWARD!!!`,
            amount: `Rp 35.000`,
            username: `Play & Win`,
            method: `CPA Premium`,
            account: `🔥 12 Slot Terakhir`
        }, '.promo-container');
        logger.log(`Generated Offer: ${offerImg}`);

        const recapImg = await (cronService as any).generateImageFromHtml('recap', {
            dateStr: new Date().toLocaleString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            amount: `Rp 15.420.000`,
            tasksCompleted: `8,492`,
            wdCompleted: `342`
        }, '.recap-container');
        logger.log(`Generated Recap: ${recapImg}`);

        // We will just run the generation and NOT actually send to telegram in this test
        logger.log('Test completed successfully. Check the /images folder.');
    } catch (error) {
        logger.error('Test failed', error);
    }

    await app.close();
}

bootstrap();

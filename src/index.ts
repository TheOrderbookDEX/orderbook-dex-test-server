#!/usr/bin/env node

import path from 'path';
import { startServer } from './test-server';

export { startServer } from './test-server';

if (require.main === module) {
    void (async function() {
        console.log('Starting server...');
        console.log();
        const { treasury, addressBook, operatorFactory, operatorV1, orderbookFactory, tokens, orderbooks } = await startServer({
            dbPath: path.resolve(process.cwd(), 'db'),
            verbose: process.argv.includes('--verbose'),
        });
        console.log('Treasury address:');
        console.log(`    ${treasury}`);
        console.log('AddressBook address:');
        console.log(`    ${addressBook}`);
        console.log('OperatorFactory address:');
        console.log(`    ${operatorFactory}`);
        console.log('OperatorV1 address:');
        console.log(`    ${operatorV1}`);
        console.log('OrderbookFactoryV1 address:');
        console.log(`    ${orderbookFactory}`);
        console.log('Tokens addresses:');
        for (const [ token, address ] of Object.entries(tokens)) {
            console.log(`    ${token} ${address}`);
        }
        console.log('Orderbooks addresses:');
        for (const [ pair, address ] of Object.entries(orderbooks)) {
            console.log(`    ${pair} ${address}`);
        }
        console.log();
        console.log('RPC server listening on http://localhost:8545/');
        console.log();
    })();
}

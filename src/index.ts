#!/usr/bin/env node

import path from 'path';
import { startServer } from './test-server';

export { startServer } from './test-server';

if (require.main === module) {
    void (async function() {
        console.log('Starting server...');
        console.log();
        const { addressBook, logicRegistry, operatorFactory, operatorLogic, orderbookFactory, tokens, orderbooks } = await startServer({
            dbPath: path.resolve(process.cwd(), 'db'),
            verbose: process.argv.includes('--verbose'),
        });
        console.log('AddressBook address:');
        console.log(`    ${addressBook}`);
        console.log('OperatorLogicRegistry address:');
        console.log(`    ${logicRegistry}`);
        console.log('OperatorFactory address:');
        console.log(`    ${operatorFactory}`);
        console.log('OperatorLogicV1 address:');
        console.log(`    ${operatorLogic}`);
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

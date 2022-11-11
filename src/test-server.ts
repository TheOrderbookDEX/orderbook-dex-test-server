import ganache, { EthereumProvider } from 'ganache';
import { AddressBook } from '@frugal-wizard/addressbook/dist/AddressBook';
import { ERC20Mock } from '@theorderbookdex/orderbook-dex/dist/testing/ERC20Mock';
import { OperatorFactory } from '@theorderbookdex/orderbook-dex-operator/dist/OperatorFactory';
import { OrderbookCreated, OrderbookFactoryV1 } from '@theorderbookdex/orderbook-dex-v1/dist/OrderbookFactoryV1';
import { startOrderbookSimulation } from './orderbook-simulation';
import { createSigner, getBlockNumber, getContractAddress, hexstring } from '@frugal-wizard/abi2ts-lib';
import { OperatorV1 } from '@theorderbookdex/orderbook-dex-v1-operator/dist/OperatorV1';

export interface ServerOptions {
    dbPath?: string,
    port?: number,
    verbose?: boolean,
}

export interface Server {
    addressBook: string,
    operatorFactory: string;
    operatorV1: string;
    orderbookFactory: string,
    tokens: { [symbol: string]: string },
    orderbooks: { [pair: string]: string },
}

interface Global {
    ethereum?: EthereumProvider;
}

const global = globalThis as Global;

export async function startServer({ dbPath, port = 8545, verbose }: ServerOptions): Promise<Server> {
    const server = ganache.server({
        logging: {
            quiet: true,
        },
        database: {
            dbPath,
        },
    });
    global.ethereum = server.provider;
    if (await getBlockNumber() == 0) {
        const signer = await createSigner('0x0000000000000000000000000000000000000000000000000000000000000001');
        await global.ethereum.send('evm_setAccountBalance', [ signer.address, hexstring(1000000000000000000000n) ]);
        const addressBook      = (await signer.sendTransaction(await AddressBook.populateTransaction.deploy())).contractAddress;
        const operatorFactory  = (await signer.sendTransaction(await OperatorFactory.populateTransaction.deploy(signer.address, addressBook))).contractAddress;
        const operatorV1       = (await signer.sendTransaction(await OperatorV1.populateTransaction.deploy())).contractAddress;
        const orderbookFactory = (await signer.sendTransaction(await OrderbookFactoryV1.populateTransaction.deploy(addressBook))).contractAddress;
        const WBTC             = (await signer.sendTransaction(await ERC20Mock.populateTransaction.deploy('Wrapped BTC', 'WBTC', 18))).contractAddress;
        const WETH             = (await signer.sendTransaction(await ERC20Mock.populateTransaction.deploy('Wrapped Ether', 'WETH', 18))).contractAddress;
        const BNB              = (await signer.sendTransaction(await ERC20Mock.populateTransaction.deploy('BNB', 'BNB', 18))).contractAddress;
        const WXRP             = (await signer.sendTransaction(await ERC20Mock.populateTransaction.deploy('Wrapped XRP', 'WXRP', 18))).contractAddress;
        const USDT             = (await signer.sendTransaction(await ERC20Mock.populateTransaction.deploy('Tether USD', 'USDT', 6))).contractAddress;
        await signer.sendTransaction(await OrderbookFactoryV1.at(orderbookFactory).populateTransaction.createOrderbook(WBTC, USDT, 1000000000000000n,   100000n));
        await signer.sendTransaction(await OrderbookFactoryV1.at(orderbookFactory).populateTransaction.createOrderbook(WETH, USDT, 10000000000000000n,  100000n));
        await signer.sendTransaction(await OrderbookFactoryV1.at(orderbookFactory).populateTransaction.createOrderbook(BNB,  USDT, 100000000000000000n, 100000n));
        await signer.sendTransaction(await OrderbookFactoryV1.at(orderbookFactory).populateTransaction.createOrderbook(WXRP, USDT, 1000000000000000000n, 10000n));
        await signer.sendTransaction(await OperatorFactory.at(operatorFactory).populateTransaction.registerVersion(10000n, operatorV1));
    }
    let blockNumber = 2;
    const addressBook      = await getContractAddress(blockNumber++, 0);
    const operatorFactory  = await getContractAddress(blockNumber++, 0);
    const operatorV1       = await getContractAddress(blockNumber++, 0);
    const orderbookFactory = await getContractAddress(blockNumber++, 0);
    const WBTC             = await getContractAddress(blockNumber++, 0);
    const WETH             = await getContractAddress(blockNumber++, 0);
    const BNB              = await getContractAddress(blockNumber++, 0);
    const WXRP             = await getContractAddress(blockNumber++, 0);
    const USDT             = await getContractAddress(blockNumber++, 0);
    const tokens = { WBTC, WETH, BNB, WXRP, USDT };
    const orderbooks: { [pair: string]: string } = {};
    for await (const { orderbook, tradedToken, baseToken } of OrderbookCreated.get({ fromBlock: 11, toBlock: 14 })) {
        const pair = `${await ERC20Mock.at(tradedToken).symbol()}/${await ERC20Mock.at(baseToken).symbol()}`;
        orderbooks[pair] = orderbook;
        startOrderbookSimulation(orderbook, verbose);
    }
    await server.listen(port);
    return { addressBook, operatorFactory, operatorV1, orderbookFactory, tokens, orderbooks };
}

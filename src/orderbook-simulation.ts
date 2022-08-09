import { createSigner, formatValue, getBalance, hexstring, hexstringPad } from '@theorderbookdex/abi2ts-lib';
import { IAddressBook } from '@theorderbookdex/addressbook/dist/interfaces/IAddressBook';
import { EthereumProvider } from 'ganache';
import { IOrderbookV1 } from '@theorderbookdex/orderbook-dex-v1/dist/interfaces/IOrderbookV1';
import { IERC20Mock } from '@theorderbookdex/orderbook-dex/dist/testing/interfaces/IERC20Mock';

const SIMULATION_DELAY = 10000;

enum OrderType {
    SELL,
    BUY,
}

interface Global {
    ethereum?: EthereumProvider;
}

const global = globalThis as Global;

export function startOrderbookSimulation(address: string, verbose = false) {
    (async function() {
        const signer = await createSigner(hexstringPad(address, 64));
        if (!await getBalance(signer.address)) {
            await global.ethereum?.send('evm_setAccountBalance', [ signer.address, hexstring(1000000000000000000000n) ]);
        }
        const orderbook = IOrderbookV1.at(address);
        const tradedToken = IERC20Mock.at(await orderbook.tradedToken());
        const baseToken = IERC20Mock.at(await orderbook.baseToken());
        const contractSize = await orderbook.contractSize();
        const priceTick = await orderbook.priceTick();
        const pair = `${await tradedToken.symbol()}/${await baseToken.symbol()}`;
        const decimals = await baseToken.decimals();
        {
            const addressBook = IAddressBook.at(await orderbook.addressBook());
            if (!await addressBook.id(signer.address)) {
                await signer.sendTransaction(await addressBook.populateTransaction.register());
            }
        }
        let bullish = true;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                const askPrice = await orderbook.askPrice();
                const bidPrice = await orderbook.bidPrice();
                if (randomBoolean()) {
                    // BUY
                    const price = randomPrice(askPrice || bidPrice || 100n * priceTick, priceTick, bullish);
                    if (!askPrice || price < askPrice) {
                        // PLACE
                        const amount = BigInt(randomInt(10) + 1);
                        if (verbose) console.log(`Placing buy ${amount} contract(s) order at ${formatValue(price, decimals)} in ${pair}`);
                        await signer.sendTransaction(await baseToken.populateTransaction.giveMe(amount * price));
                        await signer.sendTransaction(await baseToken.populateTransaction.approve(orderbook, amount * price));
                        await signer.sendTransaction(await orderbook.populateTransaction.placeOrder(OrderType.BUY, price, amount));
                    } else {
                        // FILL
                        const amount = BigInt(randomInt(5) + 1);
                        if (verbose) console.log(`Buying ${amount} contract(s) at ${formatValue(price, decimals)} or better in ${pair}`);
                        await signer.sendTransaction(await baseToken.populateTransaction.giveMe(amount * price));
                        await signer.sendTransaction(await baseToken.populateTransaction.approve(orderbook, amount * price));
                        await signer.sendTransaction(await orderbook.populateTransaction.fill(OrderType.SELL, amount, price, 255));
                    }
                } else {
                    // SELL
                    const price = randomPrice(bidPrice || askPrice || 100n * priceTick, priceTick, bullish);
                    if (!bidPrice || price > bidPrice) {
                        // PLACE
                        const amount = BigInt(randomInt(10) + 1);
                        if (verbose) console.log(`Placing sell ${amount} contract(s) order at ${formatValue(price, decimals)} in ${pair}`);
                        await signer.sendTransaction(await tradedToken.populateTransaction.giveMe(amount * contractSize));
                        await signer.sendTransaction(await tradedToken.populateTransaction.approve(orderbook, amount * contractSize));
                        await signer.sendTransaction(await orderbook.populateTransaction.placeOrder(OrderType.SELL, price, amount));
                    } else {
                        // FILL
                        const amount = BigInt(randomInt(5) + 1);
                        if (verbose) console.log(`Selling ${amount} contract(s) at ${formatValue(price, decimals)} or better in ${pair}`);
                        await signer.sendTransaction(await tradedToken.populateTransaction.giveMe(amount * contractSize));
                        await signer.sendTransaction(await tradedToken.populateTransaction.approve(orderbook, amount * contractSize));
                        await signer.sendTransaction(await orderbook.populateTransaction.fill(OrderType.BUY, amount, price, 255));
                    }
                }
            } catch (error) {
                console.error(error);
            }
            if (!randomInt(10)) bullish = !bullish;
            await wait(SIMULATION_DELAY);
        }
    })();
}

function randomPrice(currentPrice: bigint, priceTick: bigint, bullish: boolean) {
    const direction = (bullish ? 1 : -1) * (randomInt(10) ? 1 : -1);
    let price: bigint;
    do {
        price = currentPrice + BigInt(Math.abs(Math.round(randomGaussian() * 10)) * direction) * priceTick;
    } while(price <= 0n);
    return price;
}

async function wait(time: number) {
    return new Promise(resolve => {
        setTimeout(resolve, time);
    });
}

function randomInt(n: number) {
    return Math.floor(Math.random() * n);
}

function randomBoolean() {
    return Math.random() < 0.5;
}

function randomGaussian() {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

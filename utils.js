import dotenv from 'dotenv';
import { createSignWithKeypair } from '@kadena/client';
dotenv.config();

// !All keyPairs should be related to sender account
export const publicKey = process.env.PUBLIC_KEY;

export const createSignFunc = () => {
    const secretKey = process.env.SECRET_KEY;

    if (!publicKey || !secretKey) {
        throw new Error('PUBLIC_KEY or SECRET_KEY are missed in .env');
    }

    const keyPair = {
        publicKey,
        secretKey,
    };

    return createSignWithKeypair(keyPair);
};

export const sign = createSignFunc();

export const validateArgs = (account, to, amount, chainId, targetChainId) => {
    if (!account || !to || !amount || !chainId || !targetChainId)
        throw new Error('Not all arguments provided');

    if (typeof account !== 'string' || typeof to !== 'string')
        throw new Error('Account and To must be strings');

    if (typeof chainId !== 'string' || typeof targetChainId !== 'string')
        throw new Error('Chain ID and Target Chain ID must be strings');

    if (isNaN(+chainId) || isNaN(+targetChainId))
        throw new Error('Chain ID and Target Chain ID must be numeric strings');

    // should be like IPactDecimal {decimal: '1'}
    if (typeof amount !== 'object' || !('decimal' in amount))
        throw new Error('Invalid format of amount');
};

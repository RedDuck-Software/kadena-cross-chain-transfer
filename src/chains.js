import { createClient } from '@kadena/client';

// export const networkId = 'mainnet01';
export const networkId = 'testnet04';

export const isTestnet = true;

export const SUPPORTED_CHAIN_IDS = ['1', '0'];

export const getTestnetAPIUrl = (chainId) => {
    if (!SUPPORTED_CHAIN_IDS.includes(chainId))
        throw new Error('TC: Unsupported chainId');
    return `https://api.testnet.chainweb.com/chainweb/0.0/${networkId}/chain/${chainId}/pact`;
};
export const getMainnetAPIUrl = (chainId) => {
    if (!SUPPORTED_CHAIN_IDS.includes(chainId))
        throw new Error('TC: Unsupported chainId');
    return `https://api.chainweb.com/chainweb/0.0/${networkId}/chain/${chainId}/pact`;
};

export const getKadenaClient = (chainId) => {
    return createClient(
        isTestnet ? getTestnetAPIUrl(chainId) : getMainnetAPIUrl(chainId)
    );
};

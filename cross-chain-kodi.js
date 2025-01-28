import { Pact, isSignedTransaction, readKeyset } from '@kadena/client';
import { sign, publicKey, validateArgs } from './utils.js';
import { getKadenaClient, networkId } from './chains.js';
import { kodi } from './addresses.js';

export const crossChainTransferKodi = async (
    account,
    to,
    amount,
    chainId,
    targetChainId
) => {
    try {
        validateArgs(account, to, amount, chainId, targetChainId);

        const client = getKadenaClient(chainId);
        const crossChainClient = getKadenaClient(targetChainId);
        console.log('PROCESSING...');
        const rawTransaction = Pact.builder
            .execution(
                Pact.modules[kodi].defpact['transfer-crosschain'](
                    account,
                    to,
                    readKeyset('ks'),
                    targetChainId,
                    amount
                )
            )
            .addSigner(publicKey, (withCapability) => [
                withCapability('coin.GAS'),
                withCapability(
                    `${kodi}.TRANSFER_XCHAIN`,
                    account,
                    to,
                    amount,
                    targetChainId
                ),
            ])
            .addKeyset('ks', 'keys-all', to.slice(2))
            .setNetworkId(networkId)
            .setMeta({ chainId, gasLimit: 100000, senderAccount: account })
            .createTransaction();

        const signedTx = await sign(rawTransaction);

        if (!isSignedTransaction(signedTx)) {
            throw new Error('Something went wrong with signing .');
        }

        const estimateResponse = await client.local(signedTx);
        if (estimateResponse.result.status === 'failure') {
            throw estimateResponse.result.error;
        }

        const txDescriptor = await client.submit(signedTx);
        console.log('cross-chain transfer submitted');
        const response = await client.pollOne(txDescriptor);

        if (response.result.status === 'failure') {
            throw response.result.error;
        }

        const spvProof = await client.pollCreateSpv(
            txDescriptor,
            targetChainId
        );

        console.log('spvProof was generated successfully');

        const continuationTx = Pact.builder
            .continuation({
                pactId: response.continuation?.pactId || '',
                rollback: false,
                step: 1,
                proof: spvProof,
            })
            .setMeta({
                chainId: targetChainId,
                senderAccount: 'kadena-xchain-gas',
                gasLimit: 850,
                gasPrice: 0.00000001,
            })
            .setNetworkId(networkId)
            .addSigner(publicKey)
            .createTransaction();

        const signedContTx = await sign(continuationTx);

        const localResponse = await crossChainClient.local(signedContTx);
        if (localResponse.result.status === 'failure') {
            console.error(
                'Local continuationTx command failed:',
                localResponse.result.error
            );
            throw localResponse.result.error;
        }

        if (!isSignedTransaction(signedContTx)) {
            throw new Error('Something went wrong signing continuationTx.');
        }

        const continuationRequest = await crossChainClient.submit(signedContTx);
        console.log('continuation submitted');

        const continuationRes = await crossChainClient.pollOne(
            continuationRequest
        );
        console.log('crossChainTransferKDA SUCCESS', continuationRes);
    } catch (e) {
        console.log('ERR crossChainTransferKDA:', e);
    }
};

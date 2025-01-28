import { Pact, isSignedTransaction, readKeyset } from '@kadena/client';
import { sign, publicKey, validateArgs } from './utils.js';
import { getKadenaClient, networkId } from './chains.js';
// import { crossChainTransferKodi } from './cross-chain-kodi.js';

const crossChainTransferKDA = async (
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
                Pact.modules.coin.defpact['transfer-crosschain'](
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
                    'coin.TRANSFER_XCHAIN',
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

crossChainTransferKDA(
    'k:a840ac0128c0dc91fe8cff8a22671bc125c5e290c42a5fc6a7cb3a9d38c8c13b',
    'k:9dd1a138782d6d6f347ec2c9518f6328ef1c3b0a8041010a4db6c4a1d5979a79',
    { decimal: '0.122' },
    '1',
    '0'
);

// crossChainTransferKodi(
//     'k:a840ac0128c0dc91fe8cff8a22671bc125c5e290c42a5fc6a7cb3a9d38c8c13b',
//     'k:9dd1a138782d6d6f347ec2c9518f6328ef1c3b0a8041010a4db6c4a1d5979a79',
//     { decimal: '111' },
//     '1',
//     '0'
// );

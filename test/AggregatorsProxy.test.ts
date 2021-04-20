import { expect, assert } from 'chai';
// const chai = require("chai");
// const chaiAsPromised = require("chai-as-promised");

// chai.use(chaiAsPromised);

// // Then either:
// const expect = chai.expect;
// // or:
// const assert = chai.assert;

import {
    AggregatorsProxyContract,
    AggregatorsProxyInstance
} from '../build/types/truffle-types';
// Load compiled artifacts
const proxyContract: AggregatorsProxyContract = artifacts.require('AggregatorsProxy.sol');
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
import { BigNumber } from 'bignumber.js';

contract('Asset Management Center', async accounts => {

    let proxyInstance: AggregatorsProxyInstance;
    let denominator = new BigNumber(10).exponentiatedBy(18);

    before('Get AggregatorProxy contract instance', async () => {
        proxyInstance = await proxyContract.at('0x3fd972736cab2e72afd2261eb643a63af596a8f6');
    });


    describe('AggregatorProxy', () => {

        it('Show state', async () => {
            let fee = await proxyInstance.fee();
            console.log('Fee: ' + new BigNumber(fee).div(denominator).toFixed(6, 1));
            let thirdPartFee=await proxyInstance.thirdPartyFee();
            console.log('Third Party Fee: ' + new BigNumber(thirdPartFee).div(denominator).toFixed(6, 1));
            let dev = await proxyInstance.dev();
            console.log('dev: ' + dev);
            let owner = await proxyInstance.owner();
            console.log('owner: ' + owner);
        });
        it('Test swap from 0x', async () => {
            try {
                let fromToken = '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82';
                let toToken = '0x55d398326f99059ff775485246999027b3197955';
                let approveTarget = '0xDef1C0ded9bec7F1a1670819833240f027b25EfF';
                let fromTokenAmount = '10000000000000000000';
                let minReturnAmount = '0';
                let callData = '0xc43c9ef600000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000001589964980abcd7f3000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000e09fabb73bd3ade0a17ecc321fd13a19e81ce82000000000000000000000000bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c00000000000000000000000055d398326f99059ff775485246999027b3197955869584cd000000000000000000000000221d5c4993297fd95fa17743b9297e2e49fce9d20000000000000000000000000000000000000000000000bec65c826560764de2';
                let now = new Date().getTime();
                let deadLine = Math.floor(now / 1000) + 20 * 60;
                let thirdPartyAddress = '0xc529b0738cFAeaDb378bdC9FF0B35dc6DAf2a65D';
                await proxyInstance.swap(fromToken, toToken, approveTarget, fromTokenAmount, minReturnAmount, callData, thirdPartyAddress, deadLine);
            } catch (e) {
                console.log(e.message);
            }
        });
        it('Test swap from 1inch', async () => {
            try {
                let fromToken = '0xb8C540d00dd0Bf76ea12E4B4B95eFC90804f924E';
                let toToken = '0x55d398326f99059ff775485246999027b3197955';
                let approveTarget = '0x11111112542d85b3ef69ae05771c2dccff4faa26';
                let fromTokenAmount = '10000000000000000000';
                let minReturnAmount = '0';
                let callData = '0x7c025200000000000000000000000000c603a00595d5f8ea8d93c5c338c00ff29dba625800000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000180000000000000000000000000b8c540d00dd0bf76ea12e4b4b95efc90804f924e00000000000000000000000055d398326f99059ff775485246999027b3197955000000000000000000000000c603a00595d5f8ea8d93c5c338c00ff29dba62580000000000000000000000008f8dd7db1bda5ed3da8c9daf3bfa471c12d584860000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000d97f887bceeacf70000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000560000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000002c080000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000064eb5625d9000000000000000000000000b8c540d00dd0bf76ea12e4b4b95efc90804f924e0000000000000000000000003919874c7bc0699cf59c981c5eb668823fa4f9580000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000008000000000000000000000003919874c7bc0699cf59c981c5eb668823fa4f9580000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000084a6417ed6000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000001a4b3af37c00000000000000000000000000000000000000000000000000000000000000080800000000000000000000000000000000000000000000000000000000000004400000000000000000000000055d398326f99059ff775485246999027b3197955000000000000000000000000000000010000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000064d1660f9900000000000000000000000055d398326f99059ff775485246999027b31979550000000000000000000000008f8dd7db1bda5ed3da8c9daf3bfa471c12d5848600000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
                let now = new Date().getTime();
                let deadLine = Math.floor(now / 1000) + 20 * 60;
                let thirdPartyAddress = '0xc529b0738cFAeaDb378bdC9FF0B35dc6DAf2a65D';
                await proxyInstance.swap(fromToken, toToken, approveTarget, fromTokenAmount, minReturnAmount, callData, thirdPartyAddress, deadLine);
            } catch (e) {
                console.log(e.message);
            }
        });
    });

});

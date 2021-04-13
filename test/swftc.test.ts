import { expect, assert } from 'chai';
// const chai = require("chai");
// const chaiAsPromised = require("chai-as-promised");

// chai.use(chaiAsPromised);

// // Then either:
// const expect = chai.expect;
// // or:
// const assert = chai.assert;

import {
    SWFTCTokenContract,
    SWFTCTokenInstance
} from '../build/types/truffle-types';
// Load compiled artifacts
const tokenContract: SWFTCTokenContract = artifacts.require('SWFTCToken.sol');
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
import { BigNumber } from 'bignumber.js';

contract('Asset Management Center', async accounts => {

    let swftcInstance: SWFTCTokenInstance;
    let denominator = new BigNumber(10).exponentiatedBy(18);

    before('Get SWFTCToken contract instance', async () => {
        swftcInstance = await tokenContract.deployed();
    });


    describe('SWFTCToken', () => {

        it('Show state', async () => {
            let totalSupply = await swftcInstance.totalSupply();
            console.log('SWFTC Address: ' + swftcInstance.address);
            console.log('Total Supply: ' + new BigNumber(totalSupply).div(denominator).toFormat(9, 1));
            let owner = await swftcInstance.owner();
            let minter = await swftcInstance.minter();
            console.log('owner address: ' + owner);
            console.log('minter address: ' + minter);
            let ownerBal = await swftcInstance.balanceOf(accounts[0]);
            console.log('owner balance: ' + new BigNumber(ownerBal).div(denominator).toFormat(9, 1));
        });
        it('Test mint', async () => {
            try {
                await swftcInstance.mint(accounts[1], '10000000000000000000', { from: accounts[1] });
            } catch (e) {
                console.log(e.message);
            }
        });

    });

});

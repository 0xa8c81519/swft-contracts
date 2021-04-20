const AggregatorsProxy = artifacts.require("AggregatorsProxy");
const config = {
    // owner: '0x9aF96DCB5c8B1C37eFF6Bbaaa75049FcD1d69dA6',
    // minter: ''
};

module.exports = async function (deployer, network, accounts) {
    let owner;
    if (config && config.owner) {
        owner = config.owner;
    } else {
        owner = accounts[0];
    }

    if (deployer.network.indexOf('skipMigrations') > -1) { // skip migration
        return;
    }
    if (deployer.network.indexOf('_test') > -1) { // skip migration
        return;
    }
    if (deployer.network.indexOf('kovan_oracle') > -1) { // skip migration
        return;
    }
    if (deployer.network_id == 4) { // Rinkeby
    } else if (deployer.network_id == 1) { // main net
    } else if (deployer.network_id == 42) { // kovan
    } else if (deployer.network_id == 56) { // bsc main net
        // fee 0.1%
        let fee = '1000000000000000';
        // third party fee 30%
        let thirdPartyFee = '300000000000000000';
        let dev='0x9aF96DCB5c8B1C37eFF6Bbaaa75049FcD1d69dA6';
        await deployer.deploy(AggregatorsProxy, 'SWFT Aggregators Proxy', 'SWFTAP-Beta-v1', dev, fee, thirdPartyFee, owner);
    } else if (deployer.network_id == 5777 || deployer.network_id == 97) { //dev or bsc_test
        // fee 0.1%
        let fee = '1000000000000000';
        // third party fee 30%
        let thirdPartyFee = '300000000000000000';
        let dev='0x9aF96DCB5c8B1C37eFF6Bbaaa75049FcD1d69dA6';
        await deployer.deploy(AggregatorsProxy, 'SWFT Aggregators Proxy', 'SWFTAP-Beta-v1', dev, fee, thirdPartyFee, owner);
    } else {

    }

};

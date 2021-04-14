const SWFTCToken = artifacts.require("BEP20SWFTC");
const config = {
    // owner: '',
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
    } else if (deployer.network_id == 5777 || deployer.network_id == 97) { //dev or bsc_test
        deployer.deploy(SWFTCToken, accounts[0], accounts[0]);
    } else {

    }

};

const AggregatorsProxy = artifacts.require("AggregatorsProxy");
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
        await deployer.deploy(AggregatorsProxy, '0x0000000000000000000000000000000000000000', owner);
        let proxyInstance = await AggregatorsProxy.deployed();
        // fee 0.3%
        await proxyInstance.setFee('3000000000000000');
        // add white list
        await proxyInstance.addWhiteList('0x11111112542d85b3ef69ae05771c2dccff4faa26');
        await proxyInstance.addWhiteList('0xDef1C0ded9bec7F1a1670819833240f027b25EfF');
        await proxyInstance.setDev(owner);
    } else {

    }

};

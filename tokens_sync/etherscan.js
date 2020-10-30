var axios = require('axios');
const constants = require('./constants');

async function getAllTokenTransfers(startBlock) {
    let maxRecords = 1000;
    await new Promise(resolve => setTimeout(resolve, 500));
    var config = {
        method: 'get',
        url: `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=0x${constants.token_contract_address_hash}&startblock=${startBlock}&endblock=${constants.end_block}&page=1&offset=${maxRecords + 1}&sort=asc&apikey=${constants.etherscanAPIKey}`,
        headers: {}
    };
    var response = await axios(config);
    if (response.status != 200) {
        throw Error('Error while getting token transfers from etherscan: ' + response.status + ' ' + response.statusText);
    }
    if (response.data["status"] != '1') {
        if (response.data["message"] == 'No transactions found') return [];
        throw Error('Error while getting token transfers from etherscan: ' + response.data["message"]);
    }
    let result = response.data["result"];
    if (result.length > maxRecords) {
        let lastBlockNumber = result[result.length - 1].blockNumber;
        while (result[result.length - 1].blockNumber == lastBlockNumber) {
            result.pop();
        }
    }
    return result;
}

async function getBalance(address) {
    await new Promise(resolve => setTimeout(resolve, 500));
    var config = {
        method: 'get',
        url: `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=0x${constants.token_contract_address_hash}&address=0x${address}&apikey=${constants.etherscanAPIKey}`,
        headers: {}
    };
    var response = await axios(config);
    if (response.status != 200) {
        throw Error('Error while getting balance from etherscan: ' + response.status + ' ' + response.statusText);
    }
    if (response.data["status"] != '1') {
        throw Error('Error while getting balance from etherscan: ' + response.data["message"]);
    }
    return response.data["result"];
}

const callUntilSuccessful = (func) => async (...args) => {
    try {
        return await func(...args);
    } catch (err) {
        console.log('Error: ' + err.message);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return await callUntilSuccessful(func)(...args);
    }
}

module.exports = {
    getAllTokenTransfers: callUntilSuccessful(getAllTokenTransfers),
    getBalance: callUntilSuccessful(getBalance)
};

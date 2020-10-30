const { Pool } = require('pg');
const dateFormat = require('dateformat');
const Web3 = require('web3')
const etherscan = require('./etherscan');
const constants = require('./constants');
var web3 = new Web3(new Web3.providers.HttpProvider(constants.endpoint));

var tokenTransferLogIndex = {};

const pool = new Pool({
    database: constants.dbname,
    user: constants.dbusername,
    host: constants.dbhost,
    password: constants.dbpassword,
    port: constants.dbport,
});

pool.on('error', (err, client) => {
    console.error('Error:', err);
});

async function insertToken() {
    let query = `SELECT * FROM tokens where symbol = '${constants.token}'`;
    let res = await pool.query(query);
    if (res[`rowCount`] === 0) {
        await checkAndPutAddressInDB('0x' + constants.token_contract_address_hash);
        let timestamp = dateFormat(new Date(), `yyyy-mm-dd HH:MM:ss`);
        let query4 = `INSERT INTO tokens(symbol, total_supply, decimals, type, contract_address_hash, inserted_at, updated_at, holder_count) VALUES ('${constants.token}', ${constants.totalSupply}, 18, 'ERC-20',decode('${constants.token_contract_address_hash}','hex'), '${timestamp}', '${timestamp}', 0)`;
        await pool.query(query4);
    }
}

async function updateBalance(address) {
    await checkAndPutAddressInDB(address);
    let query1 = `SELECT address_hash FROM address_current_token_balances WHERE address_hash=decode('${address}','hex')`;
    let res = await pool.query(query1);
    if (res[`rowCount`] == 0) {
        let timestamp = dateFormat(new Date(), `yyyy-mm-dd HH:MM:ss`);
        let query2 = `INSERT INTO address_current_token_balances (address_hash, block_number, token_contract_address_hash, value, value_fetched_at, inserted_at, updated_at, old_value) VALUES(decode('${address}','hex'), ${constants.address_block_number}, decode('${constants.token_contract_address_hash}','hex'), NULL, '${timestamp}', '${timestamp}', '${timestamp}', NULL)`;
        await pool.query(query2);
    }
    let balance = await etherscan.getBalance(address)
    let query3 = `UPDATE address_current_token_balances set value = ${parseInt(balance)} where address_hash = decode('${address}','hex')`;
    await pool.query(query3);
}

async function syncTokenTransfers() {
    try {
        let query = `SELECT block_number FROM token_transfers where token_contract_address_hash = decode('${constants.token_contract_address_hash}', 'hex') ORDER BY block_number DESC limit 1`;
        let res = await pool.query(query);
        let lastSyncedBlockNumber = (res[`rows`][0] && res[`rows`][0][`block_number`]) || 0;
        let tokenTransfers = await etherscan.getAllTokenTransfers(lastSyncedBlockNumber + 1);
        if (tokenTransfers.length != 0) {
            await putTokenTransfersInDB(tokenTransfers);
        }
        else{
            let timestamp = dateFormat(new Date(), `yyyy-mm-dd HH:MM:ss`);
            let query3 = `UPDATE tokens set last_sync = '${timestamp}' where contract_address_hash = decode('${constants.token_contract_address_hash}','hex')`;
            await pool.query(query3);
        }
    } catch (err) {
        console.log(err);
    }
    setTimeout(syncTokenTransfers, 15000);
}

async function putTokenTransfersInDB(tokenTransfers) {
    for (let i = 0; i < tokenTransfers.length; i++) {
        await checkAndPutBlockInDB(tokenTransfers[i]["blockHash"]);
        await checkAndPutAddressInDB(tokenTransfers[i]["from"]);
        await checkAndPutAddressInDB(tokenTransfers[i]["to"]);
        await checkAndPutAddressInDB(tokenTransfers[i]["contractAddress"]);

        let timestamp = dateFormat(new Date(parseInt(tokenTransfers[i]["timeStamp"])), `yyyy-mm-dd HH:MM:ss`);

        if (!await checkTransactionInDB(tokenTransfers[i]["hash"])) {
            let query = `INSERT INTO transactions (cumulative_gas_used, error, gas, gas_price, gas_used, hash, "index", "input", nonce, r, s, status, v, value, 
                inserted_at, updated_at, block_hash, block_number, from_address_hash, to_address_hash, created_contract_address_hash, created_contract_code_indexed_at, earliest_processing_start, old_block_hash, revert_reason, tags) VALUES
                (${tokenTransfers[i]["cumulativeGasUsed"]}, NULL, ${tokenTransfers[i]["gas"]}, ${tokenTransfers[i]["gasPrice"]}, ${tokenTransfers[i]["gasUsed"]}, decode('${tokenTransfers[i]["hash"].substring(2,)}','hex'), 
                ${tokenTransfers[i]["transactionIndex"]}, decode('','hex'), ${tokenTransfers[i]["nonce"]}, 22079230095499827004143053283563682517464495179505432350121269737065234937535, 45175598860638580620412884775545814234927718267404587971218348804458307944316, 1, 28, ${tokenTransfers[i]["value"]}, 
                '${timestamp}', '${timestamp}', decode('${tokenTransfers[i]["blockHash"].substring(2,)}','hex'), ${tokenTransfers[i]["blockNumber"]}, decode('${tokenTransfers[i]["from"].substring(2,)}','hex'), decode('${tokenTransfers[i]["to"].substring(2,)}','hex'), NULL, NULL, NULL, NULL, NULL, NULL)`;
            let res = await pool.query(query);
        }

        if (!tokenTransferLogIndex[tokenTransfers[i]["hash"]]) {
            tokenTransferLogIndex[tokenTransfers[i]["hash"]] = 1;
        } else {
            tokenTransferLogIndex[tokenTransfers[i]["hash"]]++;
        }

        let query2 = `INSERT INTO token_transfers (transaction_hash, log_index, from_address_hash, to_address_hash, amount, token_contract_address_hash, inserted_at, updated_at, block_number, block_hash) VALUES (decode('${tokenTransfers[i]["hash"].substring(2,)}','hex'), ${tokenTransferLogIndex[tokenTransfers[i]["hash"]]}, decode('${tokenTransfers[i]["from"].substring(2,)}','hex'), decode('${tokenTransfers[i]["to"].substring(2,)}','hex'), 
            ${tokenTransfers[i]["value"]}, decode('${constants.token_contract_address_hash}','hex'), '${timestamp}', '${timestamp}', ${tokenTransfers[i]["blockNumber"]}, decode('${tokenTransfers[i]["blockHash"].substring(2,)}','hex'))`;
        let res2 = await pool.query(query2);

        await updateBalance(tokenTransfers[i]["from"].substring(2,));
        await updateBalance(tokenTransfers[i]["to"].substring(2,));
    }
}

async function checkTransactionInDB(hash) {
    let query = `SELECT hash FROM transactions WHERE hash=decode('${hash.substring(2,)}','hex')`;
    let res = await pool.query(query);
    if (res["rowCount"] == 1) {
        return true;
    } else {
        return false;
    }
}

async function checkAndPutAddressInDB(address_hash) {
    let query = `SELECT hash FROM addresses WHERE hash=decode('${address_hash.substring(2,)}','hex')`;
    let res = await pool.query(query);
    if (res[`rowCount`] == 0) {
        let timestamp = dateFormat(new Date(), `yyyy-mm-dd HH:MM:ss`);
        let query = `INSERT INTO addresses (hash,contract_code,inserted_at,updated_at,nonce,decompiled,verified) VALUES (decode('${address_hash.substring(2,)}','hex'),NULL,'${timestamp}','${timestamp}',NULL,false,false)`;
        await pool.query(query);
    }
}

async function checkAndPutBlockInDB(block_hash) {
    let query = `SELECT hash FROM blocks WHERE hash=decode('${block_hash.substring(2,)}','hex')`;
    let res = await pool.query(query);
    if (res[`rowCount`] == 0) {
        let timestamp = dateFormat(new Date(), `yyyy-mm-dd HH:MM:ss`);
        let blockinfo = await web3.eth.getBlock(block_hash);
        await checkAndPutAddressInDB(blockinfo['miner']);
        query = `INSERT INTO blocks (consensus, difficulty, gas_limit, gas_used, hash, miner_hash, nonce, "number", parent_hash, "size", "timestamp", total_difficulty, inserted_at, updated_at, refetch_needed) VALUES
        (true, ${blockinfo['difficulty']}, ${blockinfo['gasLimit']}, ${blockinfo['gasUsed']}, decode('${blockinfo['hash'].substring(2,)}','hex'), decode('${blockinfo['miner'].substring(2,)}','hex'), decode('${blockinfo['nonce'].substring(2,)}','hex'), 
        ${blockinfo['number']}, decode('${blockinfo['parentHash'].substring(2,)}','hex'), ${blockinfo['size']}, '${dateFormat(new Date(blockinfo['timestamp'] * 1000), 'yyyy-mm-dd HH:MM:ss')}', ${blockinfo['totalDifficulty']}, '${timestamp}', '${timestamp}', false)`;
        await pool.query(query);
    }
}

async function start() {
    try {
        await insertToken();
    } catch (err) {
        console.log(err);
        return;
    }
    syncTokenTransfers();
}

start();

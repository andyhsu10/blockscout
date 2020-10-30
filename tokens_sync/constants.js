const dotenv = require("dotenv");
dotenv.config();

const token_contract_address_hash = process.env.ADDRESS;
const token = process.env.SYMBOL;
const totalSupply = process.env.SUPPLY;
const end_block = '9999999999';
let address_block_number = 0;
const etherscanAPIKey = process.env.ETHERSCAN_API_KEY;
const endpoint = process.env.WEB3_ENDPOINT;
const dbusername = process.env.POSTGRES_USER;
const dbpassword = process.env.POSTGRES_PASSWORD;
const dbname = process.env.POSTGRES_DB;
const dbhost = process.env.POSTGRES_HOST;
const dbport = 5432;

module.exports = { token_contract_address_hash, token, address_block_number, totalSupply, end_block, etherscanAPIKey, dbusername, dbpassword, dbname, dbhost, dbport, endpoint };
import { GraphQLClient, gql } from "graphql-request";
import { json2csv } from "json-2-csv";
import fs from "fs";
import { JsonRpcProvider } from "@ethersproject/providers";
import { Wallet } from "@ethersproject/wallet";
import { Contract } from "@ethersproject/contracts";
import dotenv from "dotenv";

dotenv.config();

const provider = new JsonRpcProvider(process.env.RPC_URL);

const wallet = new Wallet(process.env.PRIV_KEY, provider);

const abi: string[] = [
  "function sendToMany(address[] recipients, uint256[] amounts) returns (bool)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function transfer(address recipient, uint256 amount) returns (bool)",
  "function transferFrom(address sender, address recipient, uint256 amount) returns (bool)"
];
const tokenContractAddress = process.env.CONTRACT_ADDRESS;

const tokenContract = new Contract(tokenContractAddress, abi, wallet);

const client = new GraphQLClient(
  "https://api.thegraph.com/subgraphs/name/salmandabbakuti/flare-token",
  { headers: {} }
);

const USERS_QUERY = gql`
  query users(
    $skip: Int!
    $first: Int!
    $orderBy: String!
    $orderDirection: String!
    $where: User_filter
  ) {
    users(
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: $where
    ) {
      id
      address
      balance
      updatedAt
    }
  }
`;

const migrateUserTokens = () => {
  client
    .request(USERS_QUERY, {
      skip: 0,
      first: 1000,
      orderBy: "updatedAt",
      orderDirection: "desc",
      where: {}
    })
    .then(async (data: any) => {
      // prepare data for csv
      // write to csv
      json2csv(data.users, (err: any, csv: any) => {
        if (err) {
          throw err;
        }
        fs.writeFileSync("./users.csv", csv);
      });
      // TODO: send tokens to users batch wise
      // console.log(`users: ${data.users}`);
      console.log(await tokenContract.totalSupply());
      // const tx = await tokenContract.sendToMany(data.users.map((user: any) => user.address), data.users.map((user: any) => user.balance));
      // await tx.wait();
      // console.log("sent to users");
    })
    .catch((err: any) => {
      console.error(`failed to fetch users: ${err}`);
    });
};

migrateUserTokens();

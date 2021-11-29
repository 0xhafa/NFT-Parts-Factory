# NFT Parts Factory

We created an ERC-721 standard-based non-fungible token contract as the last assignment for the Smart Contract Development Essentials module (BCDV 1010) of George Brown's Blockchain Development course (T175).

The contract is designed to mint and assemble NFTs together.

**Students:**\
Kasper Pawlowski 101367569 Kasper.Pawlowski@georgebrown.ca\
Rafael Albuquerque 101374734 Rafael.AlbuquerqueBezerra@georgebrown.ca

**Teacher:**\
Dhruvin Parikh

## Local

1. `git clone` this repo to your local environment.
2. `npm install` the required dependencies.
3. In the command line, run `truffle migrate`.
4. In the command line, run `truffle develop`.
5. To interact with the contract, first initialize a contract instance `let instance = await PartsFactory.deployed()`.

## Functions 
Besides functions from [ERC721 standard](https://eips.ethereum.org/EIPS/eip-721), the contract implement the following functions: 

1. **`mintSinglePart`** - Mints `partId` and transfers it to `_owner`.\
1. **`assembleParts`** - Assembles `_partIds` and mints `newPartID`.\
1. **`disassemblePart`** - Disassembled children parts from `_partId`.\
1. **`addToAssembly`** - Adds `_partIds` to `_assemblyPartId` children parts.\
1. **`removeFromAssembly`** - Remove `_partId` from `_assemblyPartId`.\ 


## Testing
Test on truffle by running `truffle test`


## License
[MIT](https://choosealicense.com/licenses/mit/)
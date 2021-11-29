# NFT Parts Factory

We created an ERC-721 standard-based non-fungible token contract as the last assignment for the Smart Contract Development Essentials module (BCDV 1010) of George Brown's Blockchain Development course (T175).

The contract is designed to mint and assemble NFTs together to better reflect their complicated nature. Until now, the majority of the NFTs in the space have been representing simple objects that do not have any relation with each other. Our project proposes a new way of minting NFTs that can either be simple or assembled into more complex objects representing complexity of the nature. Such a complex NFT when assembled, would be still ERC-721 compliant NFT from the high level perspective. However when transferred, it would take all the dependants with it to a new owner.

Imagine a NFT of a car that is not just a sigle NFT, but consists from many parts i.e chassis, bodywork, engine. These parts can comprise other parts and so on (i.e. bodywork can consist of a hood, doors, bumper, roof, windshield etc). Such approach gives NFTs custom and more interesting utility like ability to add parts and tune aforementioned car or change its rims for larger. Such approach may boost the NFT market, but also be used to represent real world complex objects.

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
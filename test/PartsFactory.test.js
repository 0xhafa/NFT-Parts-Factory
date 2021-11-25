const PartsFactory = artifacts.require('PartsFactory');
const AssertionError = require('assertion-error');
const truffleAssert = require('truffle-assertions');

contract('PartsFactory', (accounts) => {
    let pFactory;
    const ownerAccount = accounts[0];

    beforeEach(async () => {
        pFactory = await PartsFactory.deployed();
    })

    //Check constructor
    it("Should set correct Name and Symbol", async function () {
        let name = await pFactory.name();
        let symbol = await pFactory.symbol();
        assert.equal(name, "CarParts");
        assert.equal(symbol, "CARP");
    });

    //Check balanceOf()
    it("Should display correct balance", async function () {
        let balance;
        //Minting tokens to check balance[]
        for(let i=1; i <= 3; i++){
            await pFactory.mintPart(ownerAccount);
            balance = await pFactory.balanceOf(ownerAccount);
            assert.equal(balance, i);
        }
        //Transfering tokens to re-check balance[]
        await pFactory.transferFrom(ownerAccount, accounts[1], 1);
        balance = await pFactory.balanceOf(ownerAccount);
        assert.equal(balance, 2);
        let newBalance = await pFactory.balanceOf(accounts[1]);
        assert.equal(newBalance, 1);
    });

    //Check ownerOf()
    it("Should return correct token owners", async function () {
        //account[0] should have tokens [2,3] and accounts[1] should have tokens [1]
        assert.equal(await pFactory.ownerOf(3), ownerAccount);
        assert.equal(await pFactory.ownerOf(1), accounts[1]);
        assert.notEqual(await pFactory.ownerOf(2), accounts[1]);
    });

    //Check safeTransferFrom
    it("Should transfer tokens to ERC721Receiver address", async function () {
        await truffleAssert.passes(pFactory.safeTransferFrom(ownerAccount, accounts[2], 2));
        assert.equal(await pFactory.ownerOf(2), accounts[2]);
        // revert sending token not owned
        await truffleAssert.reverts(pFactory.safeTransferFrom(ownerAccount, accounts[2], 2));
        // revert sending token to non ERC721Receiver address
        await truffleAssert.reverts(pFactory.safeTransferFrom(ownerAccount, pFactory.address, 3));
    });

    //Check transferFrom()
    it("", async function () {

    });

    //Check Transfer event
    it("", async function () {

    });

    //Check approve()
    it("", async function () {
        
    });

    //check Approval event
    it("", async function () {
        
    });

    //Check setApprovalForAll()
    it("", async function () {
        
    });

    //check ApprovalForAll event
    it("", async function () {
        
    });

    //Check getApproved()
    it("", async function () {
        
    });

    //check isApprovedForAll()
    it("", async function () {
        
    });

})
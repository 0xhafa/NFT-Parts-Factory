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
        assert.equal(name, "PartsFactory");
        assert.equal(symbol, "PF");
    });

    //Check balanceOf()
    it("Should display correct balance", async function () {
        let balance = await pFactory.balanceOf(ownerAccount);
        assert.equal(balance, 0);
        //Minting tokens to check balance[]
        for(let i=1; i <= 3; i++){
            await pFactory.mintSinglePart(ownerAccount);
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
    it("Should transfer token from account[0] to account[3]", async function () {
        await truffleAssert.passes(pFactory.safeTransferFrom(ownerAccount, accounts[1], 3));
        assert.equal(await pFactory.ownerOf(3), accounts[1]);
    });

    //Check Transfer event
    it("Should emit Transfer event", async function () {
        let _transfer = await pFactory.transferFrom(accounts[1], ownerAccount, 1, {from: accounts[1]});
        truffleAssert.eventEmitted(_transfer, 'Transfer', (ev) => {
            return ev.from === accounts[1] && ev.to === ownerAccount && ev.tokenId == 1;
        })
    });

    //Check approve() and  getApproved()
    it("Should approve address to transfer token", async function () {
        await truffleAssert.passes(pFactory.approve(accounts[2], 1, {from: ownerAccount}));
        assert.equal(await pFactory.getApproved(1), accounts[2]);
    });

    //check Approval event
    it("Should emit Aprroval event", async function () {
        let _approve = await pFactory.approve(accounts[1], 1, {from: ownerAccount});
        truffleAssert.eventEmitted(_approve, 'Approval', (ev) => {
            return ev.owner === ownerAccount && ev.approved === accounts[1] && ev.tokenId == 1;
        })
    });

    //Check setApprovalForAll() and isApprovedForAll()
    it("Should approve address for all tokens", async function () {
        await truffleAssert.passes(pFactory.setApprovalForAll(accounts[2], true, {from: ownerAccount}));
        assert.equal(await pFactory.isApprovedForAll(ownerAccount, accounts[2]), true);
    });

    //check ApprovalForAll event
    it("Should emit ApprovedForAll event", async function () {
        let _setApprovalForAll = await pFactory.setApprovalForAll(accounts[1], true, {from: ownerAccount});
        truffleAssert.eventEmitted(_setApprovalForAll, 'ApprovalForAll', (ev) => {
            return ev.owner === ownerAccount && ev.operator === accounts[1] && ev.approved === true;
        })
    });

})
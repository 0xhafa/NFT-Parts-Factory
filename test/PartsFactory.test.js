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
            await pFactory.mintSinglePart(ownerAccount, i, `Part no ${i}`, `Manufacturer ${i}`);
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
        await truffleAssert.reverts(pFactory.safeTransferFrom(ownerAccount, pFactory.address, 3, {gas: 1000000}));
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

contract('PartsFactory', (accounts) => {
    let pFactory;
    const ownerAccount = accounts[0];

    beforeEach(async () => {
        pFactory = await PartsFactory.deployed();
    })

    //Should mintParts correctly
    it("Should mintParts correctly", async function () {
        for(let i=1; i <= 3; i++){
            await truffleAssert.passes(pFactory.mintSinglePart(ownerAccount, i, `Part no ${i}`, `Manufacturer ${i}`));
            balance = await pFactory.balanceOf(ownerAccount);
            assert.equal(balance, i);
            _part = await pFactory.getPart(i);
            assert.equal(_part.partNumber, i);
            assert.equal(_part.name, `Part no ${i}`);
            assert.equal(_part.manufacturer, `Manufacturer ${i}`);
            assert.equal(_part.status, 0);
            assert.equal(_part.parentPartId, 0);
        }
    });

    //Should mint assembledPart correctly
    it("Should mint assembledPart correctly", async function () {
        await truffleAssert.passes(pFactory.assembleParts(100, `Assembled Part`, `Manufacturer`, [1,2]));
        balance = await pFactory.balanceOf(ownerAccount);
        assert.equal(balance, 4);
        _part = await pFactory.getPart(4);
        assert.equal(_part.partNumber, 100);
        assert.equal(_part.name, `Assembled Part`);
        assert.equal(_part.manufacturer, `Manufacturer`);
        assert.equal(_part.status, 0);
        assert.equal(_part.parentPartId, 0);
        relations = await pFactory.getPartRelations(4);
        _relations = relations.toString();
        assert.equal(_relations, [1,2]);
    });

    //Should show correct status for ASSEMBLED parts
    it("Should show correct status and parentPartId for ASSEMBLED parts", async function () {
        for(let i=1; i <= 2; i++){
            _part = await pFactory.getPart(i);
            assert.equal(_part.status, 1);
            assert.equal(_part.parentPartId, 4);
        }
    });
    
    //Should add to assembledPart correctly
    it("Should add to assembledPart correctly", async function () {
        await truffleAssert.passes(pFactory.addToAssembly(4,[3]));
        _part = await pFactory.getPart(3);
        assert.equal(_part.status, 1);
        assert.equal(_part.parentPartId, 4);
        assembledRelations = await pFactory.getPartRelations(4);
        assembledPartLenght = assembledRelations.length;
        assert.equal(assembledPartLenght, 3);
    });

    //Should show correct status for ASSEMBLED parts
    it("Should show correct status and parentPartId for ASSEMBLED parts", async function () {
        for(let i=1; i <= 3; i++){
            _part = await pFactory.getPart(i);
            assert.equal(_part.status, 1);
            assert.equal(_part.parentPartId, 4);
        }
    });

    //Should disassemble All correctly
    it("Should disassemble All correctly", async function () {
        await truffleAssert.passes(pFactory.disassemblePart(4));
        await truffleAssert.reverts(pFactory.ownerOf(4),
            "VM Exception while processing transaction: revert ERC721: owner query for nonexistent token"
        );
        for(let i=1; i <= 3; i++){
            _part = await pFactory.getPart(i);
            assert.equal(_part.status, 0);
            assert.equal(_part.parentPartId, 0);
        }
    });

    //Should remove all part from two-sized assembly when triggering `removeFromAssembly`
    it("Should remove part from two-sized assembly correctly", async function () {
        await truffleAssert.passes(pFactory.assembleParts(100, `Assembled Part`, `Manufacturer`, [1,2]));
        await truffleAssert.passes(pFactory.removeFromAssembly(5,1));
        await truffleAssert.reverts(pFactory.ownerOf(5),
            "VM Exception while processing transaction: revert ERC721: owner query for nonexistent token"
        );
        for(let i=1; i <= 2; i++){
            _part = await pFactory.getPart(i);
            assert.equal(_part.status, 0);
            assert.equal(_part.parentPartId, 0);
        }
    });

    //Should remove part from n>2 size assembly correctly
    it("Should remove part from two-sized assembly correctly", async function () {
        await truffleAssert.passes(pFactory.assembleParts(100, `Assembled Part`, `Manufacturer`, [1,2,3]));
        for(let i=1; i <= 3; i++){
            _part = await pFactory.getPart(i);
            assert.equal(_part.status, 1);
            assert.equal(_part.parentPartId, 6);
        }
        await truffleAssert.passes(pFactory.removeFromAssembly(6,2));
        //Check childrenPartIds of parts[6]
        relations = await pFactory.getPartRelations(6);
        _relations = relations.toString();
        assert.equal(_relations, [1,3]);

        //Check status and parentPartId of parts[1]
        _part = await pFactory.getPart(1);
        assert.equal(_part.status, 1);
        assert.equal(_part.parentPartId, 6);

        //Check status and parentPartId of parts[3]
        _part = await pFactory.getPart(3);
        assert.equal(_part.status, 1);
        assert.equal(_part.parentPartId, 6);

    });

    //Should revert when trying to `disassemblePart` not authourized part
    it("Should revert when trying to disassemble not authourized part", async function () {
        await truffleAssert.reverts(pFactory.disassemblePart(6, {from: accounts[1]}),
            "Not authorized to move this part"
        );
    });
    
    //Should revert when trying to `removeFromAssembly` not authourized part
    it("Should revert when trying to disassemble not authourized part", async function () {
        await truffleAssert.reverts(pFactory.removeFromAssembly(6,1, {from: accounts[1]}),
            "Not authorized to move this part"
        );
    });

    //Should revert when trying to assemble not authorized part
    it("Should revert when trying to disassemble not authourized part", async function () {
        await truffleAssert.passes(pFactory.mintSinglePart(accounts[1], 7, `Part no 7`, `Manufacturer 7`));
        await truffleAssert.reverts(pFactory.assembleParts(101, `Assembled Part`, `Manufacturer`, [6,7], {from: accounts[1]}),
            "VM Exception while processing transaction: revert Not authorized to move one or more of these parts"
        );
    });

    //Should revert when trying to approve ASSEMBLED part
    it("Should approve ASSEMBLED part correctly", async function () {
        await truffleAssert.passes(pFactory.approve(accounts[1], 6));
        assert.equal(await pFactory.getApproved(6), accounts[1]);
    });

    //Should revert when trying to transfer ASSEMBLED part
    it("Should transfer ASSEMBLED part correctly", async function () {
        await truffleAssert.passes(pFactory.safeTransferFrom(ownerAccount, accounts[1], 6));
        assert.equal(await pFactory.ownerOf(6), accounts[1]);
    });

    //Should tranfers all childrenParts when ASSEMBLED part is transfered
    it("Should tranfers all childrenParts when ASSEMBLED part is transfered", async function () {
        assert.equal(await pFactory.ownerOf(1), accounts[1]);
        assert.equal(await pFactory.ownerOf(3), accounts[1]);
    });

})
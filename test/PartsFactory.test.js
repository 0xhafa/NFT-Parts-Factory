const PartsFactory = artifacts.require('PartsFactory');
const AssertionError = require('assertion-error');
const truffleAssert = require('truffle-assertions');

const verifyChildren_HelperFunction = (result, expected) => {
    assert.equal(result.length, expected.length);

    for(let i = 0; i < result.length; i++) {
        assert.equal(result[i].toNumber(), expected[i]);
    }
}

// ERC-721 functionalities test suite
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

// Custom functionalities test suite
contract('PartsFactory', (accounts) => {
    let pFactory;
    const ownerAccount = accounts[0];

    beforeEach(async () => {
        pFactory = await PartsFactory.deployed();
    })

    //Should mintParts correctly and emit newPart event
    it("Should mintParts correctly and emit newPart event", async function () {
        for(let i=1; i <= 3; i++){
            tx = await pFactory.mintSinglePart(ownerAccount, i, `Part no ${i}`, `Manufacturer ${i}`);
            balance = await pFactory.balanceOf(ownerAccount);
            assert.equal(balance, i);
            _partProperties = await pFactory.getPartProperties(i);
            assert.equal(_partProperties[0], i);
            assert.equal(_partProperties[1], `Part no ${i}`);
            assert.equal(_partProperties[2], `Manufacturer ${i}`);
            assert.equal(_partProperties[3], 0);
            _partRelations  = await pFactory.getPartRelations(i);
            assert.equal(_partRelations[0], 0);
            verifyChildren_HelperFunction(_partRelations[1], []);
            truffleAssert.eventEmitted(tx, 'newPart', (ev) => {
                return ev.owner === ownerAccount && ev.partNumber == i && ev.partId == i;
            });
        }
    });

    //Should mint assembledPart correctly and emit partAssembled event
    it("Should mint assembledPart correctly and emit partAssembled event", async function () {
        tx = await pFactory.assembleParts(100, `Assembled Part`, `Manufacturer`, [1,2]);
        balance = await pFactory.balanceOf(ownerAccount);
        assert.equal(balance, 4);
        _partProperties = await pFactory.getPartProperties(4);
        assert.equal(_partProperties[0], 100);
        assert.equal(_partProperties[1], `Assembled Part`);
        assert.equal(_partProperties[2], `Manufacturer`);
        assert.equal(_partProperties[3], 0);
        _partRelations  = await pFactory.getPartRelations(4);
        assert.equal(_partRelations[0], 0);
        verifyChildren_HelperFunction(_partRelations[1], [1,2]);
        truffleAssert.eventEmitted(tx, 'partAssembled', (ev) => {
            return ev.owner === ownerAccount && ev.partNumber == 100 && ev.partId == 4;
        });
    });

    //Should show correct status for ASSEMBLED parts
    it("Should show correct status and parentPartId for ASSEMBLED parts", async function () {
        for(let i=1; i <= 2; i++){
            _partProperties = await pFactory.getPartProperties(i);
            _partRelations  = await pFactory.getPartRelations(i);
            assert.equal(_partProperties[3], 1);
            assert.equal(_partRelations[0], 4);
        }
    });
    
    //Should add to assembledPart correctly and emit partAddedToAssembly event
    it("Should add to assembledPart correctly and emit partAddedToAssembly event", async function () {
        tx = await pFactory.addToAssembly(4,[3]);
        _partProperties = await pFactory.getPartProperties(3);
        _partRelations  = await pFactory.getPartRelations(3);
        assert.equal(_partProperties[3], 1);
        assert.equal(_partRelations[0], 4);
        assembledPartRelations  = await pFactory.getPartRelations(4);
        verifyChildren_HelperFunction(assembledPartRelations[1], [1,2,3]);
        truffleAssert.eventEmitted(tx, 'partAddedToAssembly', (ev) => {
            return ev.owner === ownerAccount && ev.parentPartId == 4 && ev.partId == 3;
        });
    });

    //Should show correct status for ASSEMBLED parts
    it("Should show correct status and parentPartId for ASSEMBLED parts", async function () {
        for(let i=1; i <= 3; i++){
            _partProperties = await pFactory.getPartProperties(i);
            _partRelations  = await pFactory.getPartRelations(i);
            assert.equal(_partProperties[3], 1);
            assert.equal(_partRelations[0], 4);
        }
    });

    //Should disassemble All correctly and emit partDisassembled event
    it("Should disassemble All correctly and emit partDisassembled event", async function () {
        tx = await pFactory.disassemblePart(4);
        await truffleAssert.reverts(pFactory.ownerOf(4),
            "VM Exception while processing transaction: revert ERC721: owner query for nonexistent token"
        );
        for(let i=1; i <= 3; i++){
            _partProperties = await pFactory.getPartProperties(i);
            _partRelations  = await pFactory.getPartRelations(i);
            assert.equal(_partProperties[3], 0);
            assert.equal(_partRelations[0], 0);
        }
        truffleAssert.eventEmitted(tx, 'partDisassembled', (ev) => {
            return ev.owner === ownerAccount && ev.partNumber == 100 && ev.parentPartId == 4 && 
                   ev.partIds.length == 3 && ev.partIds[0] == 1 && ev.partIds[1] == 2 && ev.partIds[2] == 3;
        });
    });

    //Should remove all part from two-sized assembly when triggering `removeFromAssembly`
    it("Should remove part from two-sized assembly correctly", async function () {
        await truffleAssert.passes(pFactory.assembleParts(100, `Assembled Part`, `Manufacturer`, [1,2]));
        await truffleAssert.passes(pFactory.removeFromAssembly(5,1));
        await truffleAssert.reverts(pFactory.ownerOf(5),
            "VM Exception while processing transaction: revert ERC721: owner query for nonexistent token"
        );
        for(let i=1; i <= 2; i++){
            _partProperties = await pFactory.getPartProperties(i);
            _partRelations  = await pFactory.getPartRelations(i);
            assert.equal(_partProperties[3], 0);
            assert.equal(_partRelations[0], 0);
        }
    });

    //Should remove part from n>2 size assembly correctly and emit partRemovedFromAssembly event
    it("Should remove part from two-sized assembly correctly and emit partRemovedFromAssembly event", async function () {
        await truffleAssert.passes(pFactory.assembleParts(100, `Assembled Part`, `Manufacturer`, [1,2,3]));
        for(let i=1; i <= 3; i++){
            _partProperties = await pFactory.getPartProperties(i);
            _partRelations  = await pFactory.getPartRelations(i);
            assert.equal(_partProperties[3], 1);
            assert.equal(_partRelations[0], 6);
        }
        tx = await pFactory.removeFromAssembly(6,2);
        //Check childrenPartIds of parts[6]
        _partRelations  = await pFactory.getPartRelations(6);
        verifyChildren_HelperFunction(_partRelations[1], [1,3]);
        truffleAssert.eventEmitted(tx, 'partRemovedFromAssembly', (ev) => {
            return ev.owner === ownerAccount && ev.parentPartId == 6 && ev.partId == 2;
        });

        //Check status and parentPartId of parts[1]
        _partProperties = await pFactory.getPartProperties(1);
        _partRelations  = await pFactory.getPartRelations(1);
        assert.equal(_partProperties[3], 1);
        assert.equal(_partRelations[0], 6);

        //Check status and parentPartId of parts[3]
        _partProperties = await pFactory.getPartProperties(3);
        _partRelations  = await pFactory.getPartRelations(3);
        assert.equal(_partProperties[3], 1);
        assert.equal(_partRelations[0], 6);
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

    //Revert when mint with no name, partNumber or manufacturer
    it("Should revert when mint with no name, partNumber or manufacturer", async function () {
        await truffleAssert.reverts(pFactory.mintSinglePart(ownerAccount, 0, `Part no 1`, `Manufacturer 1`),
            "Part number shouldn't be 0"
        );
        await truffleAssert.reverts(pFactory.mintSinglePart(ownerAccount, 1, '', `Manufacturer 1`),
            "Assign a name for the new part"
        );
        await truffleAssert.reverts(pFactory.mintSinglePart(ownerAccount, 1, `Part no 1`, ''),
            "Assign a manufacturer for the new part"
        );
    });

    //Revert when assemble parts from different owners
    it("Should revert when trying to assemble parts from different owners", async function () {
        await pFactory.mintSinglePart(ownerAccount, 1, `Part no 8`, `Manufacturer 1`);
        await pFactory.mintSinglePart(accounts[1], 1, `Part no 9`, `Manufacturer 1`);
        await pFactory.approve(accounts[1], 8);
        await truffleAssert.reverts(pFactory.assembleParts(101, `Assembled Part`, `Manufacturer`, [8,9], {from:accounts[1]}),
            "All the parts must have the same owner"
        );
    });

    it("Should revert when trying to assemble parts not assembled", async function () {
        await truffleAssert.reverts(pFactory.disassemblePart(8, {from: accounts[1]}),
            "Part not assembled"
        );
    });

    it("Should revert when trying to AddToAssembly parts not owned ", async function () {
        await truffleAssert.reverts(pFactory.addToAssembly(6, [8], {from: accounts[1]}),
            "Assembly and parts owner don't match"
        );
    });

    it("Should revert when trying to AddToAssembly providing no parts ", async function () {
        await truffleAssert.reverts(pFactory.addToAssembly(6,[], {from: accounts[1]}),
            "Provide at least one part to add to assembly"
        );
    });

    it("Should revert when trying to assembleParts with more than 10 parts ", async function () {
        for(let i=1; i <= 11; i++){
            await truffleAssert.passes(pFactory.mintSinglePart(ownerAccount, i, `Part no ${i}`, `Manufacturer ${i}`));
        }
        await truffleAssert.reverts(pFactory.assembleParts(100, `Assembled Part`, `Manufacturer`, [10,11,12,13,14,15,16,17,18,19,20]),
            "Too many parts provided."
        );
    });

    it("Should revert when trying to addToAssembly more than 10 parts ", async function () {
        await pFactory.assembleParts(100, `Assembled Part`, `Manufacturer`, [10,11,12,13,14,15,16,17,18,19]);
        await truffleAssert.reverts(pFactory.addToAssembly(21,[20]),
            "Too many children"
        );
    });
})


// Complex part creation and transfer
contract('PartsFactory', (accounts) => {
    let pFactory;
    const ownerAccount = accounts[0];

    beforeEach(async () => {
        pFactory = await PartsFactory.deployed();
    })

    //Should create a complex part and transfer it to different address
    it("Should mintParts, assemble them into complex part and transfer", async function () {
        for(let i=1; i <= 6; i++){
            await truffleAssert.passes(pFactory.mintSinglePart(ownerAccount, i, `Part no ${i}`, `Manufacturer ${i}`));
        }
        await truffleAssert.passes(pFactory.assembleParts(7, `Complex part no 7`, `Complex part manufacturer 7`, [1, 2, 3]));
        await truffleAssert.passes(pFactory.assembleParts(8, `Complex part no 8`, `Complex part manufacturer 8`, [4, 5, 6]));
        await truffleAssert.passes(pFactory.assembleParts(9, `Complex part no 9`, `Complex part manufacturer 9`, [7, 8]));

        const check = async () => {
            for(let i=7; i<=9; i++) {
                _partProperties = await pFactory.getPartProperties(i);
                _partRelations  = await pFactory.getPartRelations(i);
    
                assert.equal(_partProperties[0], i);
                assert.equal(_partProperties[1], `Complex part no ${i}`);
                assert.equal(_partProperties[2], `Complex part manufacturer ${i}`);
    
                if(i != 9) {
                    assert.equal(_partProperties[3], 1);
                    assert.equal(_partRelations[0], 9);
    
                    if(i == 7) {
                        verifyChildren_HelperFunction(_partRelations[1], [1, 2, 3]);
                    } else {
                        verifyChildren_HelperFunction(_partRelations[1], [4, 5, 6]);
                    }
                } else {
                    assert.equal(_partProperties[3], 0);
                    assert.equal(_partRelations[0], 0);
                    verifyChildren_HelperFunction(_partRelations[1], [7, 8]);
                } 
            }
        }
        
        check();
        assert.equal(await pFactory.balanceOf(ownerAccount), 9);
        assert.equal(await pFactory.balanceOf(accounts[1]), 0);
        await truffleAssert.passes(pFactory.transferFrom(ownerAccount, accounts[1], 9));
        assert.equal(await pFactory.balanceOf(ownerAccount), 0);
        assert.equal(await pFactory.balanceOf(accounts[1]), 9);
        check();
    });
})
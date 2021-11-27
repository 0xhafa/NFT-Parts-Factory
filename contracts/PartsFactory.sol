// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

// transferring all children with parent

contract PartsFactory is ERC721 {
    
    using Counters for Counters.Counter;
    Counters.Counter private partsCounter;
    
    // Parts assembly status 
    enum AssemblyStatus {DISASSEMBLED, ASSEMBLED}

    // Attributes of Parts
    struct Part {
        uint256 partNumber;
        string name;
        string manufacturer;
        AssemblyStatus status;
        uint256 parentPartId;
        uint256[] childrenPartId;
    }

    // Transfer status helper structure
    struct TransferHelper {
        bool inTransfer;
        uint256 parentPartId;
    }

    // partId to Part Struct
    mapping(uint256 => Part) public parts;
    TransferHelper transferHelper;


    constructor(string memory _name, string memory _symbol) ERC721(_name, _symbol) {}

    /*--------------------------EVENTS---------------------------*/

    event newPart(address indexed _owner, uint256 indexed _partNumber, uint256 indexed _partId);
    event partAssembled(address indexed _owner, uint256 indexed _partNumber, uint256 indexed _partId);
    event partDisassembled(address indexed _owner, uint256 indexed _partNumber, uint256 indexed _partId);
    event partAddedToAssembly(address indexed _owner, uint256 indexed _parentPartId, uint256 indexed _partId);
    event partRemovedFromAssembly(address indexed _owner, uint256 indexed _parentPartId, uint256 indexed _partId);

    /*------------------------MODIFIERS-------------------------*/

    // Checks if msg.sender is authorized to assemble parts 
    modifier areAuthorized(uint256[] memory _partIds) {
        for(uint8 i = 0; i < _partIds.length; i++) {
            require(_isApprovedOrOwner(msg.sender, _partIds[i]), "Not authorized to move one or more of these parts");       
        }
        _;
    }

    // Checks if all parts are disassembled
    modifier areDisassembled(uint256[] memory _partIds) {
        for(uint8 i = 0; i < _partIds.length; i++) {
            require(parts[_partIds[i]].status == AssemblyStatus.DISASSEMBLED, "One or more parts constrained");       
        }
        _;
    }

    // Checks if all parts have the same owner
    modifier haveSameOwner(uint256[] memory _partIds) {
        address prevOwner;
        for(uint8 i = 0; i < _partIds.length; i++) {
            address currOwner = ownerOf(_partIds[i]);
            require(currOwner == prevOwner || prevOwner == address(0), "All the parts must have the same owner");
            prevOwner = currOwner;
        }
        _;
    }    

    // Checks if msg.sender is authorized to assemble part
    modifier isAuthorized(uint256 _partId) {   
        require(_isApprovedOrOwner(msg.sender, _partId), "Not authorized to move this part");       
        _;
    }

    // Checks if part is disassembled
    modifier isDisassembled(uint256  _partId) {
        require(parts[_partId].status == AssemblyStatus.DISASSEMBLED, "Part constrained");       
        _;
    }


    /*------------------------FUNCTIONS-------------------------*/

    // Mints `partId` and transfers it to `_owner`.
    function mintSinglePart(
        address _owner,
        uint256 _partNumber,
        string memory _name,
        string memory _manufacturer
    )   public
        returns (uint256)
    {
        require(_partNumber != 0, "Part number shouldn't be 0");
        require(bytes(_name).length > 0, "Assign a name for the new part");
        require(bytes(_manufacturer).length > 0, "Assign a manufacturer for the new part");

        Part memory part = Part({
            partNumber: _partNumber,
            name: _name,
            manufacturer: _manufacturer,
            status: AssemblyStatus.DISASSEMBLED,
            parentPartId: 0,
            childrenPartId: new uint[](0)
        });

        partsCounter.increment();
        uint256 partId = partsCounter.current();
        parts[partId] = part;
        _mint(_owner, partId);

        emit newPart(_owner, _partNumber, partId);

        return partId;
    }

    // Assembles `_partIds` and mints `newPartID` and tranfers it to msg.sender
    function assembleParts(
        uint256 _newPartNumber,
        string memory _newPartName,
        string memory _newPartManufacturer,
        uint256[] memory _partIds
    )   public 
        areAuthorized(_partIds)
        areDisassembled(_partIds)
        haveSameOwner(_partIds)
        returns (uint256) {
        require(_partIds.length > 1, "Provide more than one part to assemble");
        require(_partIds.length <= 10, "Too many parts provided");

        address owner = ownerOf(_partIds[0]);
        uint256 newPartId = mintSinglePart(owner, _newPartNumber, _newPartName, _newPartManufacturer);

        parts[newPartId].childrenPartId = _partIds;

        for(uint8 i = 0; i < _partIds.length; i++) {
            parts[_partIds[i]].status = AssemblyStatus.ASSEMBLED;
            parts[_partIds[i]].parentPartId = newPartId;
        }

        emit partAssembled(owner, _newPartNumber, newPartId);
        return newPartId;
    }

    // Disassembled children parts from `_partId`
    function disassemblePart(
        uint256 _partId
    )   public 
        isAuthorized(_partId)
        isDisassembled(_partId)
        returns (uint256[] memory) {
        require(parts[_partId].childrenPartId.length > 0, "Part not assembled");

        uint256 length = parts[_partId].childrenPartId.length;
        uint256[] memory disassembledPartIds = new uint256[](length);
        for(uint8 i = 0; i < length; i++) {
            disassembledPartIds[i] = parts[_partId].childrenPartId[i];
            parts[parts[_partId].childrenPartId[i]].status = AssemblyStatus.DISASSEMBLED;
            parts[parts[_partId].childrenPartId[i]].parentPartId = 0;
        }

        emit partDisassembled(ownerOf(_partId), parts[_partId].partNumber, _partId);

        _burn(_partId);
        delete parts[_partId];
        return disassembledPartIds;
    }

    // Adds `_partIds` to `_assemblyPartId` children parts 
    function addToAssembly(
        uint256 _assemblyPartId,
        uint256[] memory _partIds
    )   public 
        areAuthorized(_partIds)
        isAuthorized(_assemblyPartId)
        areDisassembled(_partIds)
        isDisassembled(_assemblyPartId)
        haveSameOwner(_partIds)
        {
        address owner = ownerOf(_assemblyPartId);
        require(_partIds.length >= 1, "Provide at least one part to add to assembly");
        require(parts[_assemblyPartId].childrenPartId.length + _partIds.length <= 10, "Too many children");
        require(owner == ownerOf(_partIds[0]), "Assembly and parts owner don't match");

        for(uint8 i=0; i < _partIds.length; i++) {
            parts[_assemblyPartId].childrenPartId.push(_partIds[i]);
            parts[_partIds[i]].status = AssemblyStatus.ASSEMBLED;
            parts[_partIds[i]].parentPartId = _assemblyPartId;

            emit partAddedToAssembly(owner, _assemblyPartId, _partIds[i]);
        }
    }

    // Remove `_partId` from `_assemblyPartId`
    function removeFromAssembly(
        uint256 _assemblyPartId,
        uint256 _partId
        )   public
            isAuthorized(_partId)
            isAuthorized(_assemblyPartId)
            isDisassembled(_assemblyPartId)
            returns(uint256[] memory disassembledPartIds) {
            bool found;
            uint256 length = parts[_assemblyPartId].childrenPartId.length;
            // If `_assemblyPartId` has only 2 parts disassemble all
            if(parts[_assemblyPartId].childrenPartId.length == 2) { 
                for(uint8 i = 0; i < length; i++) {
                    if(parts[_assemblyPartId].childrenPartId[i] == _partId) {
                        found = true;
                        break;
                    }
                }
                if(found) {
                    disassembledPartIds = new uint256[](length);
                    for(uint8 j = 0; j < length; j++) {
                        disassembledPartIds[j] = parts[_assemblyPartId].childrenPartId[j];
                        parts[parts[_assemblyPartId].childrenPartId[j]].status = AssemblyStatus.DISASSEMBLED;
                        parts[parts[_assemblyPartId].childrenPartId[j]].parentPartId = 0;
                    }
                    _burn(_assemblyPartId);
                    delete parts[_assemblyPartId];
                    return disassembledPartIds;
                }
            }
            // Else disassemble only `_partId`
            else {
                disassembledPartIds = new uint256[](length);
                for(uint8 i = 0; i < length; i++) {
                    if(parts[_assemblyPartId].childrenPartId[i] == _partId) {
                        disassembledPartIds[0] = parts[_assemblyPartId].childrenPartId[i];
                        found = true;
                        parts[_assemblyPartId].childrenPartId[i] = parts[_assemblyPartId].childrenPartId[length - 1];
                        parts[_assemblyPartId].childrenPartId.pop();
                        parts[_partId].status = AssemblyStatus.DISASSEMBLED;
                        parts[_partId].parentPartId = 0;
                        break;
                    }
                }
                return disassembledPartIds;
            }
            require(found, "Part not found on the list of children");
            emit partRemovedFromAssembly(ownerOf(_assemblyPartId), _assemblyPartId, _partId);
        }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    )   internal override {
        if(from == address(0) || to == address(0)) {
            return;
        } else if(!transferHelper.inTransfer) {
            require(parts[tokenId].status == AssemblyStatus.DISASSEMBLED, "Cannot transfer constrained part");
            transferHelper.inTransfer = true;
            transferHelper.parentPartId = tokenId;
        }

        // recursive transfer of all the children along with a parent
        uint256 length = parts[tokenId].childrenPartId.length;
        for(uint8 i = 0; i < length; i++) {
            _transfer(from, to, parts[tokenId].childrenPartId[i]);
        }

        if(tokenId == transferHelper.parentPartId) {
            transferHelper.inTransfer = false;
        }
    }
}

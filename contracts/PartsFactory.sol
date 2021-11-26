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

    // ?
    struct TransferHelper {
        bool inTransfer;
        uint256 parentPartId;
    }

    // partId to Part Struct
    mapping(uint256 => Part) public parts;
    TransferHelper transferHelper;


    constructor(string memory _name, string memory _symbol) ERC721(_name, _symbol) {}

    /*--------------------------EVENTS---------------------------*/

    event newPart(address _owner, uint256 _partNumber, string _name, string _manufacturer, uint256 partId);

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
            require(parts[_partIds[i]].status == AssemblyStatus.DISASSEMBLED, "Parts constrained");       
        }
        _;
    }

    // Checks if msg.sender is authorized to assemble part
    modifier isAuthorized(uint256 _partId) {   
        require(_isApprovedOrOwner(msg.sender, _partId), "Not authorized to process this part");       
        _;
    }

    // Checks if all part are disassembled
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

        emit newPart(_owner, _partNumber, _name, _manufacturer, partId);

        return partId;
    }

function childrenPartId(uint tokenID) public view returns(uint256[] memory){
    return  parts[tokenID].childrenPartId;
}

function childrenPartLenght(uint tokenID) public view returns(uint){
    return  parts[tokenID].childrenPartId.length;
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
        returns (uint256) {
        require(_partIds.length > 1, "Provide more than one part to assemble");
        require(_partIds.length <= 10, "Too many parts provided");

        uint256 newPartId = mintSinglePart(msg.sender, _newPartNumber, _newPartName, _newPartManufacturer);
        //for (uint8 i=0; i < _partIds.length; i++){
        //    parts[newPartId].childrenPartId.push(_partIds[i]);
        //}
        parts[newPartId].childrenPartId = _partIds;

        for(uint8 i = 0; i < _partIds.length; i++) {
            parts[_partIds[i]].status = AssemblyStatus.ASSEMBLED;
            parts[_partIds[i]].parentPartId = newPartId;
        }

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
        {
        require(parts[_assemblyPartId].childrenPartId.length < 10, "Too many children");

        for(uint8 i=0; i < _partIds.length; i++) {
            parts[_assemblyPartId].childrenPartId.push(_partIds[i]);
            parts[_partIds[i]].status = AssemblyStatus.ASSEMBLED;
            parts[_partIds[i]].parentPartId = _assemblyPartId;
        }
    }

    // Remove `_partId` from `_assemblyPartId`
    // Improve: work for two-size assembly as well  
    function removeFromAssembly(
        uint256 _assemblyPartId,
        uint256 _partId
    )   public
        isAuthorized(_partId)
        isAuthorized(_assemblyPartId)
        isDisassembled(_assemblyPartId)
        {
        //Call disassemblePart() if part has only 2 parts assembled
        require(parts[_assemblyPartId].childrenPartId.length > 2, "Call disassemblePart() instead");

        bool found;
        uint256 length = parts[_assemblyPartId].childrenPartId.length;
        for(uint8 i = 0; i < length; i++) {
            if(parts[_assemblyPartId].childrenPartId[i] == _partId) {
                found = true;
                parts[_assemblyPartId].childrenPartId[i] = parts[_assemblyPartId].childrenPartId[length - 1];
                parts[_assemblyPartId].childrenPartId.pop();
                parts[_partId].status = AssemblyStatus.DISASSEMBLED;
                parts[_partId].parentPartId = 0;
                break;
            }
        }
        require(found, "Part not found on the list of children");
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

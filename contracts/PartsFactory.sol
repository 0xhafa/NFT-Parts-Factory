// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

// transferring all children with parent

contract PartsFactory is ERC721 {
    enum AssemblyStatus {DISASSEMBLED, ASSEMBLED}

    struct Part {
        uint256 partNumber;
        string name;
        string manufacturer;
        AssemblyStatus status;
        uint256 parentPartId;
        uint256[] childrenPartId;  
    }

    struct TransferHelper {
        bool inTransfer;
        uint256 parentPartId;
    }
    using Counters for Counters.Counter;
    Counters.Counter private partsCounter;
    mapping(uint256 => Part) public parts;
    TransferHelper transferHelper;

    constructor(string memory _name, string memory _symbol) ERC721(_name, _symbol) {}

    function requirePartAuthAndDisassembled(uint256 partId) private view {
        require(_isApprovedOrOwner(msg.sender, partId), "Not authorized to process this part");       
        require(parts[partId].status == AssemblyStatus.DISASSEMBLED, "Part constrained");
    }

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

        return partId;
    }

    function assembleParts(
        uint256 _newPartNumber,
        string memory _newPartName,
        string memory _newPartManufacturer,
        uint256[] memory _partIds
    )   public 
        returns (uint256) {
        require(_partIds.length > 1, "Provide more than one part to assemble");
        require(_partIds.length <= 10, "Too many parts provided");

        address prevOwner;
        for(uint8 i = 0; i < _partIds.length; i++) {
            address owner = ownerOf(_partIds[i]);
            require(owner == prevOwner || 
                    prevOwner == address(0), 
                    "All the parts must have the same owner");

            requirePartAuthAndDisassembled(_partIds[i]);
            prevOwner = owner;
        }

        uint256 newPartId = mintSinglePart(prevOwner, _newPartNumber, _newPartName, _newPartManufacturer);
        parts[newPartId].childrenPartId = _partIds;

        for(uint8 i = 0; i < _partIds.length; i++) {
            parts[_partIds[i]].status = AssemblyStatus.ASSEMBLED;
            parts[_partIds[i]].parentPartId = newPartId;
        }

        return newPartId;
    }

    function disassemblePart(
        uint256 _partId
    )   public 
        returns (uint256[] memory) {
        require(parts[_partId].childrenPartId.length > 0, "Cannot disassemble constrained part");
        requirePartAuthAndDisassembled(_partId);

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

    function addToAssembly(
        uint256 _assemblyPartId,
        uint256 _partId
    )   public {
        require(parts[_assemblyPartId].childrenPartId.length < 10, "Too many children");
        require(ownerOf(_assemblyPartId) == ownerOf(_partId), "Assembly and part owner don't match");
        require(_isApprovedOrOwner(msg.sender, _assemblyPartId), "Not authorized to add to assembly");  
        requirePartAuthAndDisassembled(_partId);

        parts[_assemblyPartId].childrenPartId.push(_partId);
        parts[_partId].status = AssemblyStatus.ASSEMBLED;
        parts[_partId].parentPartId = _assemblyPartId;
    }

    function removeFromAssembly(
        uint256 _assemblyPartId,
        uint256 _partId
    )   public {
        require(_isApprovedOrOwner(msg.sender, _assemblyPartId), "Not authorized to remove from assembly");  
        require(parts[_partId].childrenPartId.length > 2, "Call disassemblePart() instead");

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

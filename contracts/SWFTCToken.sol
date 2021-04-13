// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "./BEP20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SWFTCToken is BEP20("SWFTC Token", "SWFTC"), BEP20Burnable, Ownable {
    address public minter;

    uint256 public INITIAL_SUPPLY = 500_000_000 ether;

    constructor(address _owner, address _minter) public {
        transferOwnership(_owner);
        minter = _minter;
        _mint(_owner, INITIAL_SUPPLY);
    }

    /// @notice Creates `_amount` token to `_to`. Must only be called by the owner (BStableProxyV2).
    function mint(address _to, uint256 _amount) public {
        require(msg.sender == minter, "SWFTCToken:only minter.");
        _mint(_to, _amount);
    }
}

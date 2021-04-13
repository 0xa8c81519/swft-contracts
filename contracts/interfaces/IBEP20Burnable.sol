pragma solidity ^0.6.0;

interface IBEP20Burnable {
    
    function burn(uint256 amt) external ;

    
    function burnFrom(address account,uint256 amt) external;
}
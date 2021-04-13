pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./lib/TransferHelper.sol";
import "./interfaces/IBEP20.sol";
import "./interfaces/IChi.sol";

/// @notice Aggregators Proxy contract of SWFT
contract AggregatorsProxy is ReentrancyGuard, Ownable {
    using SafeMath for uint256;

    address constant BNB_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    mapping(address => bool) public isWhiteListed;
    address public immutable _CHI_TOKEN_;
    uint256 public _GAS_MAX_RETURN_ = 0;
    uint256 public _GAS_EXTERNAL_RETURN_ = 0;

    event Swap(
        address fromToken,
        address toToken,
        address sender,
        uint256 fromAmount,
        uint256 returnAmount
    );

    modifier noExpired(uint256 deadLine) {
        require(deadLine >= block.timestamp, "AggregatorsProxy: EXPIRED");
        _;
    }

    fallback() external payable {}

    receive() external payable {}

    constructor(address chiToken) public {
        _CHI_TOKEN_ = chiToken;
    }

    function addWhiteList(address contractAddr) public onlyOwner {
        isWhiteListed[contractAddr] = true;
    }

    function removeWhiteList(address contractAddr) public onlyOwner {
        isWhiteListed[contractAddr] = false;
    }

    function swap(
        address fromToken,
        address toToken,
        address approveTarget,
        address swapTarget,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        bytes calldata callDataConcat,
        uint256 deadLine
    )
        external
        payable
        noExpired(deadLine)
        nonReentrant
        returns (uint256 returnAmount)
    {
        require(minReturnAmount > 0, "AggregatorsProxy: RETURN_AMOUNT_ZERO");
        require(
            fromToken != _CHI_TOKEN_,
            "AggregatorsProxy: NOT_SUPPORT_SELL_CHI"
        );
        require(
            toToken != _CHI_TOKEN_,
            "AggregatorsProxy: NOT_SUPPORT_BUY_CHI"
        );

        uint256 _fromTokenBalanceOfOrigin =
            IBEP20(fromToken).balanceOf(address(this));
        if (fromToken != BNB_ADDRESS) {
            TransferHelper.safeTransferFrom(
                fromToken,
                msg.sender,
                address(this),
                fromTokenAmount
            );
            uint256 _fromTokenAmount =
                IBEP20(fromToken).balanceOf(address(this)).sub(
                    _fromTokenBalanceOfOrigin
                );
            TransferHelper.safeApprove(
                fromToken,
                approveTarget,
                _fromTokenAmount
            );
        }

        require(
            isWhiteListed[swapTarget],
            "AggregatorsProxy: Not Whitelist Contract"
        );
        uint256 _toTokenBalanceOrigin =
            toToken == BNB_ADDRESS
                ? address(this).balance
                : IBEP20(toToken).balanceOf(address(this));
        (bool success, ) =
            swapTarget.call{value: fromToken == BNB_ADDRESS ? msg.value : 0}(
                callDataConcat
            );
        require(success, "AggregatorsProxy: External Swap execution Failed");
        uint256 returnAmt =
            toToken == BNB_ADDRESS
                ? address(this).balance.sub(_toTokenBalanceOrigin)
                : IBEP20(toToken).balanceOf(address(this)).sub(
                    _toTokenBalanceOrigin
                );
        require(
            returnAmt >= minReturnAmount,
            "AggregatorsProxy: Return amount is not enough"
        );
        if (toToken == BNB_ADDRESS) {
            msg.sender.transfer(returnAmt);
        } else {
            TransferHelper.safeTransfer(toToken, msg.sender, returnAmt);
        }

        _externalGasReturn();

        emit Swap(
            fromToken,
            toToken,
            msg.sender,
            fromTokenAmount,
            returnAmount
        );
    }

    function _externalGasReturn() internal {
        uint256 _gasExternalReturn = _GAS_EXTERNAL_RETURN_;
        if (_gasExternalReturn > 0) {
            if (gasleft() > 27710 + _gasExternalReturn * 6080)
                IChi(_CHI_TOKEN_).freeUpTo(_gasExternalReturn);
        }
    }
}
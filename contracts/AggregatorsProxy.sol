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

    address public dev;

    uint256 public fee; // wei

    /// @notice Swap's log.
    /// @param fromToken token's address.
    /// @param toToken token's address.
    /// @param sender Who swap
    /// @param fromAmount Input amount.
    /// @param minReturnAmount toToken's min amount include fee amount. Not cut fee yet.
    /// @param returnAmount toToken's amount include fee amount. Not cut fee yet.
    /// @param target Contract which excute calldata.
    event Swap(
        address fromToken,
        address toToken,
        address sender,
        uint256 fromAmount,
        uint256 minReturnAmount,
        uint256 returnAmount,
        address target
    );

    modifier noExpired(uint256 deadLine) {
        require(deadLine >= block.timestamp, "AggregatorsProxy: EXPIRED");
        _;
    }

    fallback() external payable {}

    receive() external payable {}

    constructor(address chiToken, address _owner) public {
        transferOwnership(_owner);
        _CHI_TOKEN_ = chiToken;
    }

    function addWhiteList(address contractAddr) public onlyOwner {
        isWhiteListed[contractAddr] = true;
    }

    function removeWhiteList(address contractAddr) public onlyOwner {
        isWhiteListed[contractAddr] = false;
    }

    /// @notice Excute swap.
    /// @param fromToken token's address.
    /// @param toToken token's address.
    /// @param approveTarget contract's address which will excute calldata
    /// @param minReturnAmount Include fee, not sub fee amnount yet.
    /// @param callDataConcat calldata
    /// @param deadLine Deadline
    function swap(
        address fromToken,
        address toToken,
        address approveTarget,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        bytes calldata callDataConcat,
        uint256 deadLine
    ) external payable noExpired(deadLine) nonReentrant {
        require(minReturnAmount > 0, "AggregatorsProxy: RETURN_AMOUNT_ZERO");
        require(
            fromToken != _CHI_TOKEN_,
            "AggregatorsProxy: NOT_SUPPORT_SELL_CHI"
        );
        require(
            toToken != _CHI_TOKEN_,
            "AggregatorsProxy: NOT_SUPPORT_BUY_CHI"
        );

        if (fromToken != BNB_ADDRESS) {
            TransferHelper.safeTransferFrom(
                fromToken,
                msg.sender,
                address(this),
                fromTokenAmount
            );
            TransferHelper.safeApprove(
                fromToken,
                approveTarget,
                fromTokenAmount
            );
        }
        if (toToken == BNB_ADDRESS) {
            require(
                address(this).balance == 0,
                "AggregatorsProxy: Proxy's BNB balance is not clean."
            );
        } else {
            require(
                IBEP20(toToken).balanceOf(address(this)) == 0,
                "AggregatorsProxy: Proxy's toToken balance is not clean."
            );
        }
        require(
            isWhiteListed[approveTarget],
            "AggregatorsProxy: Not Whitelist Contract"
        );
        // uint256 _toTokenBalanceOrigin =
        //     toToken == BNB_ADDRESS
        //         ? address(this).balance
        //         : IBEP20(toToken).balanceOf(address(this));

        (bool success, ) =
            approveTarget.call{value: fromToken == BNB_ADDRESS ? msg.value : 0}(
                callDataConcat
            );
        require(success, "AggregatorsProxy: External Swap execution Failed");
        // uint256 returnAmt =
        //     toToken == BNB_ADDRESS
        //         ? address(this).balance.sub(_toTokenBalanceOrigin)
        //         : IBEP20(toToken).balanceOf(address(this)).sub(
        //             _toTokenBalanceOrigin
        //         );
        uint256 returnAmt =
            toToken == BNB_ADDRESS
                ? address(this).balance
                : IBEP20(toToken).balanceOf(address(this));
        require(
            returnAmt >= minReturnAmount,
            "AggregatorsProxy: Return amount is not enough"
        );
        if (fee > 0) {
            if (toToken == BNB_ADDRESS) {
                TransferHelper.safeTransferBNB(
                    dev,
                    returnAmt.mul(fee).div(10**18)
                );
                TransferHelper.safeTransferBNB(
                    msg.sender,
                    returnAmt.sub(returnAmt.mul(fee).div(10**18))
                );
            } else {
                TransferHelper.safeTransfer(
                    toToken,
                    dev,
                    returnAmt.mul(fee).div(10**18)
                );
                TransferHelper.safeTransfer(
                    toToken,
                    msg.sender,
                    returnAmt.sub(returnAmt.mul(fee).div(10**18))
                );
            }
        } else {
            if (toToken == BNB_ADDRESS) {
                TransferHelper.safeTransferBNB(msg.sender, returnAmt);
            } else {
                TransferHelper.safeTransfer(toToken, msg.sender, returnAmt);
            }
        }

        _externalGasReturn();

        emit Swap(
            fromToken,
            toToken,
            msg.sender,
            fromTokenAmount,
            minReturnAmount,
            returnAmt,
            approveTarget
        );
    }

    function _externalGasReturn() internal {
        uint256 _gasExternalReturn = _GAS_EXTERNAL_RETURN_;
        if (_gasExternalReturn > 0) {
            if (gasleft() > 27710 + _gasExternalReturn * 6080)
                IChi(_CHI_TOKEN_).freeUpTo(_gasExternalReturn);
        }
    }

    function setFee(uint256 _fee) external onlyOwner {
        fee = _fee;
    }

    function withdrawBNB() external onlyOwner {
        TransferHelper.safeTransferBNB(owner(), address(this).balance);
    }

    function withdtraw(address token) external onlyOwner {
        TransferHelper.safeTransfer(
            token,
            owner(),
            IBEP20(token).balanceOf(address(this))
        );
    }
}

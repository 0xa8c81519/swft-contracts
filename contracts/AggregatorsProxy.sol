pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./lib/TransferHelper.sol";
import "./interfaces/IBEP20.sol";
import "./interfaces/IChi.sol";
import "./BEP20.sol";

/// @notice Aggregators Proxy contract of SWFT
contract AggregatorsProxy is BEP20, ReentrancyGuard, Ownable {
    using SafeMath for uint256;

    address constant BNB_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    mapping(address => bool) public isWhiteListed;

    address public dev;

    uint256 public fee; // wei
    uint256 public thirdPartyFee; // wei

    /// @notice Swap's log.
    /// @param fromToken token's address.
    /// @param toToken token's address.
    /// @param sender Who swap
    /// @param fromAmount Input amount.
    /// @param returnAmount toToken's amount include fee amount. Not cut fee yet.
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

    constructor(
        string memory _name,
        string memory _symbol,
        address _dev,
        uint256 _fee,
        uint256 _thirdPartyFee,
        address _owner
    ) public BEP20(_name, _symbol) {
        dev = _dev;
        fee = _fee;
        thirdPartyFee = _thirdPartyFee;
        transferOwnership(_owner);
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
    /// @param thirdPartyAddress third party fee holder.
    /// @param deadLine Deadline
    function swap(
        address fromToken,
        address toToken,
        address approveTarget,
        uint256 fromTokenAmount,
        uint256 minReturnAmount,
        bytes calldata callDataConcat,
        address thirdPartyAddress,
        uint256 deadLine
    ) external payable noExpired(deadLine) nonReentrant {
        require(minReturnAmount > 0, "AggregatorsProxy: RETURN_AMOUNT_ZERO");

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

        require(
            isWhiteListed[approveTarget],
            "AggregatorsProxy: Not Whitelist Contract"
        );
        uint256 _toTokenBalanceOrigin =
            toToken == BNB_ADDRESS
                ? address(this).balance
                : IBEP20(toToken).balanceOf(address(this));
        (bool success, ) =
            approveTarget.call{value: fromToken == BNB_ADDRESS ? msg.value : 0}(
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
        if (fee > 0 && dev != address(0)) {
            if (toToken == BNB_ADDRESS) {
                if (thirdPartyAddress != address(0) && thirdPartyFee > 0) {
                    TransferHelper.safeTransferBNB(
                        thirdPartyAddress,
                        returnAmt.mul(fee).mul(thirdPartyFee).div(10**36)
                    );
                    TransferHelper.safeTransferBNB(
                        dev,
                        returnAmt.mul(fee).div(10**18).sub(
                            returnAmt.mul(fee).mul(thirdPartyFee).div(10**36)
                        )
                    );
                } else {
                    TransferHelper.safeTransferBNB(
                        dev,
                        returnAmt.mul(fee).div(10**18)
                    );
                }

                TransferHelper.safeTransferBNB(
                    msg.sender,
                    returnAmt.sub(returnAmt.mul(fee).div(10**18))
                );
            } else {
                if (thirdPartyAddress != address(0) && thirdPartyFee > 0) {
                    TransferHelper.safeTransfer(
                        toToken,
                        thirdPartyAddress,
                        returnAmt.mul(fee).mul(thirdPartyFee).div(10**36)
                    );
                    TransferHelper.safeTransfer(
                        toToken,
                        dev,
                        returnAmt.mul(fee).div(10**18).sub(
                            returnAmt.mul(fee).mul(thirdPartyFee).div(10**36)
                        )
                    );
                } else {
                    TransferHelper.safeTransfer(
                        toToken,
                        dev,
                        returnAmt.mul(fee).div(10**18)
                    );
                }

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

        emit Swap(fromToken, toToken, msg.sender, fromTokenAmount, returnAmt);
    }

    function setFee(uint256 _fee) external onlyOwner {
        fee = _fee;
    }

    function setThirdPartyFee(uint256 _thirdPartyFee) external onlyOwner() {
        thirdPartyFee = _thirdPartyFee;
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

    function setDev(address _dev) external onlyOwner {
        require(
            _dev != address(0),
            "AggregatorsProxy: 0 address can't be a dev."
        );
        dev = _dev;
    }
}

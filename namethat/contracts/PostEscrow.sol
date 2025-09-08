// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PostEscrow {
    address public creator;
    uint256 public prizePool;
    bool public winnerSelected;
    // Platform treasury address that will receive the platform fee (20%)
    address public platformTreasury;
    // Platform fee numerator/denominator (20%)
    uint256 public constant PLATFORM_FEE_NUM = 20;
    uint256 public constant PLATFORM_FEE_DEN = 100;

    event PlatformTreasurySet(address indexed setter, address indexed treasury);
    event WinnerSelected(address indexed winner, uint256 winnerShare, uint256 votersShare, uint256 platformFee);

    constructor() payable {
        creator = msg.sender;
        prizePool = msg.value;
    }

    /**
     * @notice Set the platform treasury address. Only the creator (deployer) may call.
     * If not set, platform fees will remain in the contract.
     */
    function setPlatformTreasury(address _treasury) external {
        require(msg.sender == creator, "Only creator can set treasury");
        platformTreasury = _treasury;
        emit PlatformTreasurySet(msg.sender, _treasury);
    }

    function selectWinner(address winner, address[] calldata voters) external {
        require(msg.sender == creator, "Only creator can select winner");
        require(!winnerSelected, "Winner already selected");
        require(prizePool > 0, "No funds");

        winnerSelected = true;

        uint256 winnerShare = (prizePool * 50) / 100;
        uint256 votersShare = (prizePool * 30) / 100;
        uint256 platformFee = prizePool - winnerShare - votersShare;

        // Pay winner
        payable(winner).transfer(winnerShare);

        // Pay voters evenly
        uint256 perVoter = voters.length > 0 ? votersShare / voters.length : 0;
        for (uint256 i = 0; i < voters.length; i++) {
            payable(voters[i]).transfer(perVoter);
        }

        // Transfer platform fee to treasury if set, otherwise keep in contract
        if (platformTreasury != address(0) && platformTreasury != address(this)) {
            payable(platformTreasury).transfer(platformFee);
        }

        emit WinnerSelected(winner, winnerShare, votersShare, platformFee);
    }

    function deletePost() external {
        require(msg.sender == creator, "Only creator can delete");
        require(winnerSelected, "Winner must be selected first");
        selfdestruct(payable(creator));
    }

    receive() external payable {}
}

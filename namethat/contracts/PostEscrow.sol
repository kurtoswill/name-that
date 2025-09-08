// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PostEscrow {
    address public creator;
    address public platformTreasury;
    uint256 public totalPrize;
    bool public active;

    constructor() payable {
        creator = msg.sender;
        totalPrize = msg.value;
        active = true;
    }

    modifier onlyCreator() {
        require(msg.sender == creator, "Not creator");
        _;
    }

    function setPlatformTreasury(address _treasury) external onlyCreator {
        require(_treasury != address(0), "Invalid address");
        platformTreasury = _treasury;
    }

    function distribute(address winner, address[] calldata voters) external onlyCreator {
        require(active, "Already distributed");
        require(winner != address(0), "Invalid winner");

        uint256 winnerShare = (totalPrize * 50) / 100;
        uint256 votersShare = (totalPrize * 30) / 100;
        uint256 platformShare = totalPrize - winnerShare - votersShare;

        active = false;

        payable(winner).transfer(winnerShare);

        if (voters.length > 0 && votersShare > 0) {
            uint256 perVoter = votersShare / voters.length;
            for (uint256 i = 0; i < voters.length; i++) {
                payable(voters[i]).transfer(perVoter);
            }
        }

        if (platformTreasury != address(0) && platformShare > 0) {
            payable(platformTreasury).transfer(platformShare);
        }
    }

    function deletePost() external onlyCreator {
        require(active, "Already finalized");
        active = false;
        payable(creator).transfer(address(this).balance);
    }
}

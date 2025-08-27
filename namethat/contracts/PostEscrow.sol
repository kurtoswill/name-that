// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PostEscrow {
    address public creator;
    uint256 public prizePool;
    bool public winnerSelected;

    constructor() payable {
        creator = msg.sender;
        prizePool = msg.value;
    }

    function selectWinner(address winner, address[] calldata voters) external {
        require(msg.sender == creator, "Only creator can select winner");
        require(!winnerSelected, "Winner already selected");
        require(prizePool > 0, "No funds");

        winnerSelected = true;

        uint256 winnerShare = (prizePool * 50) / 100;
        uint256 votersShare = (prizePool * 30) / 100;
        uint256 platformFee = prizePool - winnerShare - votersShare;

        payable(winner).transfer(winnerShare);

        uint256 perVoter = voters.length > 0 ? votersShare / voters.length : 0;
        for (uint256 i = 0; i < voters.length; i++) {
            payable(voters[i]).transfer(perVoter);
        }

        // Platform fee stays in contract (could send to treasury instead)
    }

    function deletePost() external {
        require(msg.sender == creator, "Only creator can delete");
        require(winnerSelected, "Winner must be selected first");
        selfdestruct(payable(creator));
    }

    receive() external payable {}
}

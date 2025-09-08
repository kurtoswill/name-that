// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PostEscrow
/// @notice Users pay to post. Platform takes a fee, remainder goes to prize pool.
///         Later, creator selects winner (50%), voters (30%), platform (20%).
contract PostEscrow {
    // ---------- State ----------
    address public immutable creator;
    uint256 public prizePool;
    bool public winnerSelected;

    // Platform treasury (locked to your wallet)
    address public constant platformTreasury = 0x0Fd3E06974a3E6173Ce2Fd5D55D44cc71B5d6579;

    uint256 public constant PLATFORM_FEE_NUM = 20;
    uint256 public constant PLATFORM_FEE_DEN = 100;

    // Reentrancy guard
    uint8 private constant NOT_ENTERED = 1;
    uint8 private constant ENTERED = 2;
    uint8 private status;

    // ---------- Events ----------
    event PostPaid(address indexed payer, uint256 amount, uint256 platformFee, uint256 addedToPool);
    event Deposit(address indexed payer, uint256 amount, uint256 platformFee, uint256 addedToPool);
    event WinnerSelected(address indexed winner, uint256 winnerShare, uint256 votersShare, uint256 platformFee);
    event VoterPaid(address indexed voter, uint256 amount);
    event PlatformPaid(address indexed treasury, uint256 amount);

    // ---------- Modifiers ----------
    modifier onlyCreator() {
        require(msg.sender == creator, "Only creator");
        _;
    }

    modifier nonReentrant() {
        require(status != ENTERED, "Reentrant");
        status = ENTERED;
        _;
        status = NOT_ENTERED;
    }

    // ---------- Constructor ----------
    constructor() payable {
        creator = msg.sender;
        prizePool = msg.value;
        status = NOT_ENTERED;
    }

    // ---------- Public functions ----------

    /// @notice Pay to create a post. 20% fee to platformTreasury, 80% into prizePool.
    function post() external payable nonReentrant {
        require(msg.value > 0, "Must send ETH to post");

        uint256 platformFee = (msg.value * PLATFORM_FEE_NUM) / PLATFORM_FEE_DEN;
        uint256 contribution = msg.value - platformFee;

        _safeSend(platformTreasury, platformFee);
        emit PlatformPaid(platformTreasury, platformFee);

        prizePool += contribution;
        emit PostPaid(msg.sender, msg.value, platformFee, contribution);
    }

    /// @notice Deposit into prizePool with same fee logic.
    function deposit() external payable nonReentrant {
        require(msg.value > 0, "Must send ETH to deposit");

        uint256 platformFee = (msg.value * PLATFORM_FEE_NUM) / PLATFORM_FEE_DEN;
        uint256 contribution = msg.value - platformFee;

        _safeSend(platformTreasury, platformFee);
        emit PlatformPaid(platformTreasury, platformFee);

        prizePool += contribution;
        emit Deposit(msg.sender, msg.value, platformFee, contribution);
    }

    /// @notice Select winner and distribute prizePool:
    ///         50% winner, 30% voters, 20% platformTreasury
    function selectWinner(address winner, address[] calldata voters) external onlyCreator nonReentrant {
        require(!winnerSelected, "Winner already selected");
        require(prizePool > 0, "No funds");

        winnerSelected = true;

        uint256 winnerShare = (prizePool * 50) / 100;
        uint256 votersShare = (prizePool * 30) / 100;
        uint256 platformFee = prizePool - winnerShare - votersShare;

        prizePool = 0;

        _safeSend(winner, winnerShare);

        if (voters.length > 0 && votersShare > 0) {
            uint256 perVoter = votersShare / voters.length;
            for (uint256 i = 0; i < voters.length; i++) {
                _safeSend(voters[i], perVoter);
                emit VoterPaid(voters[i], perVoter);
            }
        }

        _safeSend(platformTreasury, platformFee);
        emit PlatformPaid(platformTreasury, platformFee);

        emit WinnerSelected(winner, winnerShare, votersShare, platformFee);
    }

    function deletePost() external onlyCreator nonReentrant {
        require(winnerSelected, "Winner must be selected first");
        selfdestruct(payable(creator));
    }

    receive() external payable {
        prizePool += msg.value;
        emit Deposit(msg.sender, msg.value, 0, msg.value);
    }

    // ---------- Internal helpers ----------
    function _safeSend(address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool sent, ) = payable(to).call{value: amount}("");
        require(sent, "Transfer failed");
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PostEscrow
/// @notice Simple escrow for posts: users pay to post, platform takes a fee, remainder goes to a prize pool.
///         Creator can select a winner who receives 50%, voters split 30%, platform gets 20%.
contract PostEscrow {
    // ---------- State ----------
    address public immutable creator;
    uint256 public prizePool;
    bool public winnerSelected;

    // Platform treasury address that will receive the platform fee (20%)
    address public platformTreasury;

    // Platform fee numerator/denominator (20%)
    uint256 public constant PLATFORM_FEE_NUM = 20;
    uint256 public constant PLATFORM_FEE_DEN = 100;

    // Reentrancy guard
    uint8 private constant NOT_ENTERED = 1;
    uint8 private constant ENTERED = 2;
    uint8 private status;

    // ---------- Events ----------
    event PlatformTreasurySet(address indexed setter, address indexed treasury);
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
    /// @param _platformTreasury optionally set platform treasury at deployment (use address(0) to leave unset)
    constructor(address _platformTreasury) payable {
        creator = msg.sender;
        prizePool = msg.value;
        platformTreasury = _platformTreasury;
        status = NOT_ENTERED;

        if (_platformTreasury != address(0)) {
            emit PlatformTreasurySet(msg.sender, _platformTreasury);
        }
        // If deployer sent ETH with deployment, that ETH becomes part of the prize pool.
    }

    // ---------- Public functions ----------

    /// @notice Pay to create a post. 20% platform fee is forwarded to platformTreasury (if set),
    ///         remainder (80%) added to prizePool.
    function post() external payable nonReentrant {
        require(msg.value > 0, "Must send ETH to post");

        uint256 platformFee = (msg.value * PLATFORM_FEE_NUM) / PLATFORM_FEE_DEN;
        uint256 contribution = msg.value - platformFee;

        // forward platform fee immediately if treasury set, else keep in contract
        if (platformTreasureAvailable()) {
            _safeSend(platformTreasury, platformFee);
            emit PlatformPaid(platformTreasury, platformFee);
        } else {
            // keep platform fee in contract balance (so it becomes part of prizePool if desired)
            // To keep accounting simple we keep it separate by not adding it to prizePool.
            // (Contract balance will hold it — creator can withdraw later if you add such function.)
        }

        prizePool += contribution;

        emit PostPaid(msg.sender, msg.value, platformFee, contribution);
    }

    /// @notice Generic deposit (same behavior as post) — useful for top-ups by users or the creator.
    function deposit() external payable nonReentrant {
        require(msg.value > 0, "Must send ETH to deposit");

        uint256 platformFee = (msg.value * PLATFORM_FEE_NUM) / PLATFORM_FEE_DEN;
        uint256 contribution = msg.value - platformFee;

        if (platformTreasureAvailable()) {
            _safeSend(platformTreasury, platformFee);
            emit PlatformPaid(platformTreasury, platformFee);
        }

        prizePool += contribution;
        emit Deposit(msg.sender, msg.value, platformFee, contribution);
    }

    /// @notice Set (or update) the platform treasury. Only callable by creator.
    /// @dev If you want to ensure fees always go to your address, supply it at deployment instead.
    function setPlatformTreasury(address _treasury) external onlyCreator {
        require(_treasury != address(0), "Invalid treasury");
        platformTreasury = _treasury;
        emit PlatformTreasurySet(msg.sender, _treasury);
    }

    /// @notice Select a winner and distribute the prize pool:
    ///         - 50% to winner
    ///         - 30% evenly among voters
    ///         - 20% to platformTreasury (if set); otherwise stays in contract balance
    /// @param winner address of the winner
    /// @param voters array of voter addresses to divide the voters' share among
    function selectWinner(address winner, address[] calldata voters) external onlyCreator nonReentrant {
        require(!winnerSelected, "Winner already selected");
        require(prizePool > 0, "No funds");

        winnerSelected = true;

        uint256 winnerShare = (prizePool * 50) / 100; // 50%
        uint256 votersShare = (prizePool * 30) / 100; // 30%
        uint256 platformFee = prizePool - winnerShare - votersShare; // 20% (by design)

        // reset prizePool first to avoid re-entrancy effects or double spends via logic errors
        prizePool = 0;

        // Pay winner
        _safeSend(winner, winnerShare);

        // Pay voters evenly (if voters present)
        if (voters.length > 0 && votersShare > 0) {
            uint256 perVoter = votersShare / voters.length;
            for (uint256 i = 0; i < voters.length; i++) {
                _safeSend(voters[i], perVoter);
                emit VoterPaid(voters[i], perVoter);
            }
            // if votersShare % voters.length != 0 the leftover wei remains in contract balance
        } else {
            // No voters: keep the votersShare in contract balance
        }

        // Transfer platform fee to treasury if set, otherwise keep in contract
        if (platformTreasureAvailable()) {
            _safeSend(platformTreasury, platformFee);
            emit PlatformPaid(platformTreasury, platformFee);
        } else {
            // If no treasury set, platformFee remains in contract balance.
        }

        emit WinnerSelected(winner, winnerShare, votersShare, platformFee);
    }

    /// @notice Allow the creator to delete the post and send remaining contract balance to creator.
    /// @dev Only allowed after winner selected to avoid destroying before payouts.
    function deletePost() external onlyCreator nonReentrant {
        require(winnerSelected, "Winner must be selected first");
        selfdestruct(payable(creator));
    }

    /// @notice Receive fallback: treat as deposit()
    receive() external payable {
        // Forward to deposit logic; avoid code duplication by calling deposit via low-level pattern:
        // We cannot call deposit() directly from receive (because deposit is payable and uses modifiers),
        // so implement the same logic inline in minimal form (no nonReentrant).
        // For simplicity we just add the full msg.value to prizePool (without deducting platform fee).
        // Recommended: clients should call post() or deposit() explicitly.
        prizePool += msg.value;
        emit Deposit(msg.sender, msg.value, 0, msg.value);
    }

    // ---------- Internal helpers ----------

    /// @dev Returns true if platformTreasury is a non-zero address.
    function platformTreasureAvailable() internal view returns (bool) {
        return platformTreasury != address(0) && platformTreasury != address(this);
    }

    /// @dev Safe send using call; revert on failure to avoid loss of funds.
    function _safeSend(address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool sent, ) = payable(to).call{value: amount}("");
        require(sent, "Transfer failed");
    }

    // ---------- Admin / view helpers ----------
    /// @notice Emergency: allow creator to withdraw leftover contract balance to creator if necessary.
    /// @dev Only use if you understand the consequences (drains leftover fees).
    function emergencyWithdraw() external onlyCreator nonReentrant {
        uint256 bal = address(this).balance;
        require(bal > 0, "No balance");
        _safeSend(creator, bal);
    }
}

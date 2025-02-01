// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// ERC-20 interface to interact with an external token contract
interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

/**
 * @title Faucet
 * @dev A contract where players can submit their game score by paying a fixed amount of tokens.
 *      The contract maintains a Top-10 leaderboard of the highest scores.
 */
contract Faucet {
    /// @dev Structure to hold a player's address and score.
    struct Leader {
        address player;
        uint256 score;
    }

    /// @dev Top-10 leaderboard array
    Leader[10] public top10;

    /// @dev Mapping to store each address's best score
    mapping(address => uint256) public scores;

    /// @dev Reference to the ERC-20 token contract used for payment
    IERC20 public gameToken;

    /// @dev The amount of tokens required for each `submitScore` call
    uint256 public price;

    /// @dev The owner (deployer) of the contract, who can withdraw accrued tokens
    address public owner;

    /**
     * @notice Constructor: sets up the ERC-20 token address and price per score submission.
     * @param tokenAddress The address of the ERC-20 token contract.
     * @param _price The cost in tokens that a player needs to pay to submit a new score.
     */
    constructor(address tokenAddress, uint256 _price) {
        owner = msg.sender;
        gameToken = IERC20(tokenAddress);
        price = _price;
    }

    /**
     * @notice Submits a new score for the caller. 
     *         Requires an ERC-20 allowance >= price. Also, the new score must exceed the caller's existing best score.
     * @param newScore The new game score to submit.
     */
    function submitScore(uint256 newScore) external {
        require(newScore > scores[msg.sender], "Not an improvement");

        // Transfer 'price' tokens from the caller to the contract
        bool ok = gameToken.transferFrom(msg.sender, address(this), price);
        require(ok, "Token payment failed");

        // Update the user's best score
        scores[msg.sender] = newScore;

        // Check if the score enters the Top-10
        if (newScore > top10[9].score) {
            top10[9] = Leader(msg.sender, newScore);

            // Bubble the new score upwards in the array if it's higher than others
            for (uint i = 9; i > 0; i--) {
                if (top10[i].score > top10[i - 1].score) {
                    (top10[i], top10[i - 1]) = (top10[i - 1], top10[i]);
                } else {
                    break;
                }
            }
        }
    }

    /**
     * @notice Returns the current Top-10 leaderboard as an array of Leader structs.
     */
    function getTop10() external view returns (Leader[10] memory) {
        return top10;
    }

    /**
     * @notice Allows the owner to withdraw all accumulated tokens from the contract.
     * @param to The address to which the tokens will be transferred.
     */
    function withdrawTokens(address to) external {
        require(msg.sender == owner, "Not owner");
        uint256 balance = gameToken.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        gameToken.transfer(to, balance);
    }
}

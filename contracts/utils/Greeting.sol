//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../IAchievement.sol";

import "hardhat/console.sol";

/**
 @title Greeting contract to test achievement unlock mechanism
 @author Emanuele Ricci @StErMi
*/
contract Greeting {
    IAchievement private _ac;
    string public greeting;
    uint256 requiredAchievementMetdataId;

    constructor(address achievementContractAddress, uint256 _requiredAchievementMetdataId) {
        _ac = IAchievement(achievementContractAddress);
        requiredAchievementMetdataId = _requiredAchievementMetdataId;
        greeting = "Hello world";
    }

    /// @dev this function is only made for testing purpose
    /// it's needed to send funds to the contract that need to whitelist achievements
    /// and unlock them on behalf of summoners
    function supplyFunds() public payable {}

    modifier onlyWithAchievement() {
        require(
            _ac.hasAchievement(msg.sender, requiredAchievementMetdataId),
            "You don't have the required achievement"
        );
        _;
    }

    function setGreeting(string memory newGreeting) public onlyWithAchievement {
        greeting = newGreeting;
    }
}

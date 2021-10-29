//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../IAchievement.sol";
import "../AchievementModel.sol";

import "hardhat/console.sol";

/**
 @title FTM Contract
 @author Emanuele Ricci @StErMi
*/
contract FTMGame is Ownable {
    IAchievement private _ac;
    uint256 private mobAchievement;
    uint256 private miniBossAchievement;
    uint256 private bossAchievement;

    string constant contractName = "The Fantom Dungeon";

    constructor(address achievementContractAddress) {
        _ac = IAchievement(achievementContractAddress);
    }

    /// @dev this function is only made for testing purpose
    /// it's needed to send funds to the contract that need to whitelist achievements
    /// and unlock them on behalf of summoners
    function supplyFunds() public payable {}

    function setupAchievementsMetadata() public {
        AchievementModel.Metadata[] memory achievements = new AchievementModel.Metadata[](3);

        achievements[0] = AchievementModel.Metadata({
            id: 0, // ID here is not important, will be replaced by the AchievementContract
            source: address(this), // source is not important, will be replaced by the AchievementContract
            sourceName: contractName,
            rarity: AchievementModel.Rarity.Common,
            title: "Defeated first monster",
            description: "You have been brave enough to defeat the first monster of 'The Fantom Dungeon'",
            points: 5
        });

        achievements[1] = AchievementModel.Metadata({
            id: 0, // ID here is not important, will be replaced by the AchievementContract
            source: address(this), // source is not important, will be replaced by the AchievementContract
            sourceName: contractName,
            rarity: AchievementModel.Rarity.Uncommon,
            title: "Defeated first miniboss",
            description: "You have been brave enough to defeat the Eruptus, the mini boss of 'The Fantom Dungeon'",
            points: 10
        });

        achievements[2] = AchievementModel.Metadata({
            id: 0, // ID here is not important, will be replaced by the AchievementContract
            source: address(this), // source is not important, will be replaced by the AchievementContract
            sourceName: contractName,
            rarity: AchievementModel.Rarity.Epic,
            title: "Defeated final boss",
            description: "You have been brave enough to defeat Iced Giant, the final boss of 'The Fantom Dungeon'",
            points: 50
        });

        mobAchievement = _ac.registerAchievement(achievements[0]);
        miniBossAchievement = _ac.registerAchievement(achievements[1]);
        bossAchievement = _ac.registerAchievement(achievements[2]);
    }

    function setMobAchievement(uint256 metadataId) public onlyOwner {
        mobAchievement = metadataId;
    }

    function setMiniBossAchievement(uint256 metadataId) public onlyOwner {
        miniBossAchievement = metadataId;
    }

    function setBossAchievement(uint256 metadataId) public onlyOwner {
        bossAchievement = metadataId;
    }

    function adventure() public {
        // IMPORTANT
        // In your contract don't revert if awardAchievement fail, it could be because user
        // already own the achievement. Revert only when you are testing this integration
        bool success;
        string memory revertMessage;

        (success, revertMessage) = _ac.awardAchievement(msg.sender, mobAchievement);
        require(success, revertMessage);
        (success, revertMessage) = _ac.awardAchievement(msg.sender, miniBossAchievement);
        require(success, revertMessage);
        (success, revertMessage) = _ac.awardAchievement(msg.sender, bossAchievement);
        require(success, revertMessage);
    }

    function awardAchievementMob() public {
        // IMPORTANT
        // In your contract don't revert if awardAchievement fail, it could be because user
        // already own the achievement. Revert only when you are testing this integration
        (bool success, string memory revertMessage) = _ac.awardAchievement(msg.sender, mobAchievement);
        require(success, revertMessage);
    }

    function awardAchievementMiniBoss() public {
        // IMPORTANT
        // In your contract don't revert if awardAchievement fail, it could be because user
        // already own the achievement. Revert only when you are testing this integration
        (bool success, string memory revertMessage) = _ac.awardAchievement(msg.sender, miniBossAchievement);
        require(success, revertMessage);
    }

    function awardAchievementBoss() public {
        // IMPORTANT
        // In your contract don't revert if awardAchievement fail, it could be because user
        // already own the achievement. Revert only when you are testing this integration
        (bool success, string memory revertMessage) = _ac.awardAchievement(msg.sender, bossAchievement);
        require(success, revertMessage);
    }

    function awardAchievementOnlyDev(address receiver, uint256 metadataId) public onlyOwner {
        // IMPORTANT
        // In your contract don't revert if awardAchievement fail, it could be because user
        // already own the achievement. Revert only when you are testing this integration
        (bool success, string memory revertMessage) = _ac.awardAchievement(receiver, metadataId);
        require(success, revertMessage);
    }
}

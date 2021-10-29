// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

library AchievementModel {
    enum Rarity {
        Common,
        Uncommon,
        Rare,
        Epic,
        Legendary
    }

    struct Achievement {
        uint256 metadataId;
        uint256 achievementId;
        address user;
        uint256 timestamp;
    }

    struct AchievementExpanded {
        Metadata metadata;
        uint256 achievementId;
        address user;
        uint256 timestamp;
    }

    struct Metadata {
        uint256 id;
        Rarity rarity;
        address source;
        string sourceName;
        string title;
        string description;
        uint256 points;
    }
}

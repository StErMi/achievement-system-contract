// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./AchievementModel.sol";

interface IAchievement {
    //////////////////////////////////////////////////////////////////////////
    //
    // Contract specific methods to register/award an achievement
    //
    //////////////////////////////////////////////////////////////////////////

    /**
     * @notice Function used by external contract to register achievement metadata
     * @param metadata Metadata of the achievement
     * @return metadataId The ID of the registered achievement metadata
     */
    function registerAchievement(AchievementModel.Metadata memory metadata) external returns (uint256 metadataId);

    /**
     * @notice Function used by external contract to award an achievement to a receiving wallet
     * @param receiver Address of the wallet that will receive the achievement
     * @param metadataId ID of the achievement metadata
     */
    function awardAchievement(address receiver, uint256 metadataId)
        external
        returns (bool success, string memory revertMessage);

    //////////////////////////////////////////////////////////////////////////
    //
    //  Contract/Web3 apps utilities to query and filter
    //
    //////////////////////////////////////////////////////////////////////////

    /**
     * @notice Get achievement metadata by providing a metadataId
     * @param metadataId ID of the achievement metadata
     * @return List of achievements
     */
    function getMetadata(uint256 metadataId) external view returns (AchievementModel.Metadata memory);

    /**
     * @notice Get achievement expanded information by providing a achievementId
     * @param achievementId ID of the achievement
     * @return Data of the requested achievement
     */
    function getAchievement(uint256 achievementId) external view returns (AchievementModel.AchievementExpanded memory);

    /**
     * @notice Check if a user has been awarded with an achievement
     * @param user Address of the user
     * @param metadataId Achievement Metadata ID
     * @return true if he already has the achievement
     */
    function hasAchievement(address user, uint256 metadataId) external view returns (bool);

    /**
     * @notice Get the total achievement points collected by the summoner
     * @param user Address of the user
     * @param sources List of whitelisted contracts to filter achievements with. Can be empty.
     * @return amount of achievement points
     */
    function getPoints(address user, address[] memory sources) external view returns (uint256);

    /**
     * @notice Get list of achievements owned by the summoner
     * @param user Address of the user
     * @param sources List of whitelisted contracts to filter achievements with. Can be empty.
     * @param offset Position from which start
     * @param limit Amount of achievements to return
     * @return List of achievements owned by the user
     */
    function getAchievements(
        address user,
        address[] memory sources,
        uint256 offset,
        uint256 limit
    ) external view returns (AchievementModel.AchievementExpanded[] memory);
}

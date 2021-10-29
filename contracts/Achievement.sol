//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "base64-sol/base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

import "./IAchievement.sol";
import "./AchievementModel.sol";

import "hardhat/console.sol";

/**
 * @title Achievement
 * @author @StErMi
 * @notice A general purpose Achievement System for the FTM ecosystem
 */
contract Achievement is ERC721Enumerable {
    using Strings for uint256;
    using Counters for Counters.Counter;

    /// @notice Metadata ID tracker
    Counters.Counter private _metadataId;

    /// @notice Achievement ID tracker
    Counters.Counter private _achievementId;

    /// @notice Registered achievement metadats from contracts
    mapping(uint256 => AchievementModel.Metadata) private metadatas;

    /// @notice List of achievements awarded to a user
    mapping(address => AchievementModel.Achievement[]) private userAchievements;

    /// @notice NFT ID -> Achievement tracker
    mapping(uint256 => AchievementModel.Achievement) private achievements;

    /// @notice Fast check ownership of an achievement metadata
    mapping(address => mapping(uint256 => bool)) private _ownerships;

    /// @notice event emitted when an achievement is awarded to a user
    event AchievementAwarded(
        address indexed receiver,
        uint256 indexed tokenId,
        uint256 indexed metadataId,
        address source,
        string sourceName,
        AchievementModel.Rarity rarity,
        string title,
        uint256 points,
        uint256 timestamp
    );

    /// @notice event emitted when an achievement metadata is registered by a contract
    event AchievementRegistered(
        address indexed source,
        uint256 indexed metadataId,
        string sourceName,
        AchievementModel.Rarity rarity,
        string title,
        uint256 points
    );

    /// @notice Constructor
    constructor() ERC721("FTM Achievement", "FTMACK") {}

    /**
     * @notice Function used by external contract to register achievement metadata
     * @param metadata Metadata of the achievement
     * @return metadataId The ID of the registered achievement metadata
     */
    function registerAchievement(AchievementModel.Metadata memory metadata) external returns (uint256 metadataId) {
        checkMetadata(metadata);
        _metadataId.increment();

        metadata.source = msg.sender;
        metadata.id = _metadataId.current();
        metadatas[metadata.id] = metadata;

        emit AchievementRegistered(
            metadata.source,
            metadata.id,
            metadata.sourceName,
            metadata.rarity,
            metadata.title,
            metadata.points
        );

        return metadata.id;
    }

    /**
     * @notice Function used by external contract to award an achievement to a receiving wallet
     * @param receiver Address of the wallet that will receive the achievement
     * @param metadataId ID of the achievement metadata
     */
    function awardAchievement(address receiver, uint256 metadataId)
        external
        returns (bool success, string memory failMessage)
    {
        AchievementModel.Metadata storage metadata = metadatas[metadataId];

        if (metadata.source == address(0)) return (false, "Requested metadata not exist");
        if (metadata.source != msg.sender) return (false, "You are not the owner of the metadata");
        if (receiver == msg.sender) return (false, "Source can't award itself");
        if (_ownerships[receiver][metadataId] == true) return (false, "Wallet already own the achievement");

        // get the current achievement ID
        uint256 currentAchievementId = _achievementId.current();

        // Add the ownership to the summoner
        _ownerships[receiver][metadataId] = true;

        // Add the achievement to the summoner's list
        uint256 timestamp = block.timestamp;
        // AchievementModel.Achievement storage achievement = AchievementModel.Achievement(metadataId, currentAchievementId, receiver, timestamp);
        userAchievements[receiver].push(
            AchievementModel.Achievement(metadataId, currentAchievementId, receiver, timestamp)
        );
        achievements[currentAchievementId] = AchievementModel.Achievement(
            metadataId,
            currentAchievementId,
            receiver,
            timestamp
        );

        emit AchievementAwarded(
            receiver,
            currentAchievementId,
            metadataId,
            metadata.source,
            metadata.sourceName,
            metadata.rarity,
            metadata.title,
            metadata.points,
            timestamp
        );

        _safeMint(receiver, currentAchievementId);

        _achievementId.increment();

        return (true, "");
    }

    /////////////////////////
    // External Utilities
    /////////////////////////

    /**
     * @notice Get achievement metadata by providing a metadataId
     * @param metadataId ID of the achievement metadata
     * @return List of achievements
     */
    function getMetadata(uint256 metadataId) external view returns (AchievementModel.Metadata memory) {
        return metadatas[metadataId];
    }

    /**
     * @notice Get achievement expanded information by providing a achievementId
     * @param achievementId ID of the achievement
     * @return Data of the requested achievement
     */
    function getAchievement(uint256 achievementId) external view returns (AchievementModel.AchievementExpanded memory) {
        AchievementModel.Achievement storage _achievement = achievements[achievementId];
        AchievementModel.Metadata memory metadata = metadatas[_achievement.metadataId];
        return
            AchievementModel.AchievementExpanded({
                metadata: metadata,
                achievementId: achievementId,
                user: _achievement.user,
                timestamp: _achievement.timestamp
            });
    }

    /**
     * @notice Check if a user has been awarded with an achievement
     * @param user Address of the user
     * @param metadataId Achievement Metadata ID
     * @return true if he already has the achievement
     */
    function hasAchievement(address user, uint256 metadataId) external view returns (bool) {
        return _ownerships[user][metadataId];
    }

    /**
     * @notice Get the total achievement points collected by the summoner
     * @param user Address of the user
     * @param sources List of whitelisted contracts to filter achievements with. Can be empty.
     * @return amount of achievement points
     */
    function getPoints(address user, address[] memory sources) external view returns (uint256) {
        (, , uint256 points) = filterAchievements(user, sources);
        return points;
    }

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
    ) external view returns (AchievementModel.AchievementExpanded[] memory) {
        (AchievementModel.AchievementExpanded[] memory _tempList, uint256 maxWhitelistedLength, ) = filterAchievements(
            user,
            sources
        );

        uint256 safeLimit = limit == 0 ? 2**32 - 1 : limit;

        if (safeLimit > maxWhitelistedLength) {
            require(maxWhitelistedLength >= offset, "Offset is greater than number of records available");
        }

        uint256 maxLen = safeLimit > maxWhitelistedLength ? maxWhitelistedLength - offset : safeLimit;
        AchievementModel.AchievementExpanded[] memory _achievements = new AchievementModel.AchievementExpanded[](
            maxLen
        );

        for (uint256 i = 0; i < maxLen; i++) {
            _achievements[i] = _tempList[offset + i];
        }

        return _achievements;
    }

    /////////////////////////
    // Internal Utilities
    /////////////////////////

    /**
     * @dev Filter summoner's achievement by the list of whitelisted sources
     */
    function filterAchievements(address user, address[] memory sources)
        internal
        view
        returns (
            AchievementModel.AchievementExpanded[] memory,
            uint256,
            uint256
        )
    {
        // Get the correct length
        uint256 achievementCount = userAchievements[user].length;
        uint256 points = 0;
        AchievementModel.AchievementExpanded[] memory _tempList = new AchievementModel.AchievementExpanded[](
            achievementCount
        );

        uint256 maxWhitelistedLength = 0;
        for (uint256 i = 0; i < achievementCount; i++) {
            AchievementModel.Achievement storage _achievement = userAchievements[user][i];
            AchievementModel.Metadata memory metadata = metadatas[_achievement.metadataId];

            bool whitelisted = false;
            if (sources.length > 0) {
                for (uint256 j = 0; j < sources.length; j++) {
                    if (metadata.source == sources[j]) {
                        whitelisted = true;
                        break;
                    }
                }

                if (whitelisted == false) {
                    // skip this achivement
                    continue;
                }
            }

            points += metadata.points;

            AchievementModel.AchievementExpanded memory achievement = AchievementModel.AchievementExpanded({
                metadata: metadata,
                achievementId: _achievement.achievementId,
                user: _achievement.user,
                timestamp: _achievement.timestamp
            });
            _tempList[maxWhitelistedLength] = achievement;
            maxWhitelistedLength++;
        }

        return (_tempList, maxWhitelistedLength, points);
    }

    /**
     * @dev Check the integrity of a achievement metadata
     */
    function checkMetadata(AchievementModel.Metadata memory _metadata) internal pure {
        require(
            _metadata.rarity >= AchievementModel.Rarity.Common && _metadata.rarity <= AchievementModel.Rarity.Legendary,
            "Invalid rarity"
        );
        require(bytes(_metadata.sourceName).length > 0, "Source Name must not be empty");
        require(bytes(_metadata.title).length > 0, "Title must not be empty");
        require(bytes(_metadata.description).length > 0, "Description must not be empty");
        require(_metadata.points > 0, "Points must be greater than 0");
    }

    /////////////////////////
    // ERC721 overrides
    /////////////////////////

    /**
     * @dev Returns the Uniform Resource Identifier (URI) for `tokenId` token.
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "token does not exist");

        AchievementModel.Achievement storage _achievement = achievements[tokenId];
        AchievementModel.Metadata memory metadata = metadatas[_achievement.metadataId];

        string[11] memory parts;
        parts[
            0
        ] = '<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet" viewBox="0 0 350 350"><style>.base { fill: white; font-family: serif; font-size: 14px; }</style><rect width="100%" height="100%" fill="black" /><text x="10" y="20" class="base">';

        parts[1] = string(abi.encodePacked("Source: ", metadata.sourceName));

        parts[2] = '</text><text x="10" y="40" class="base">';

        parts[3] = string(abi.encodePacked("Title: ", metadata.title));

        parts[4] = '</text><text x="10" y="60" class="base">';

        parts[5] = string(abi.encodePacked("Description: ", metadata.description));

        parts[6] = '</text><text x="10" y="80" class="base">';

        parts[7] = string(abi.encodePacked("Rarity: ", uint256(metadata.rarity).toString()));

        parts[8] = '</text><text x="10" y="100" class="base">';

        parts[9] = string(abi.encodePacked("Points: ", metadata.points.toString()));

        parts[10] = "</text></svg>";

        string memory output = string(
            abi.encodePacked(parts[0], parts[1], parts[2], parts[3], parts[4], parts[5], parts[6], parts[7], parts[8])
        );
        output = string(abi.encodePacked(output, parts[9], parts[10]));

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "Archievement #',
                        tokenId.toString(),
                        '", "description": "FTM Achievement to track user achievements and engagement with the platform", "image": "data:image/svg+xml;base64,',
                        Base64.encode(bytes(output)),
                        '"}'
                    )
                )
            )
        );
        output = string(abi.encodePacked("data:application/json;base64,", json));

        return output;
    }

    /**
     * @dev Hook that is called before any token transfer. Check if the user has the NFT locked
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721Enumerable) {
        // Archievement can be minted but it cannot be transferred to other users, it's soulbound to the person
        require(from == address(0), "The Archievement NFT is soul bound to the user");
        super._beforeTokenTransfer(from, to, tokenId);
    }
}

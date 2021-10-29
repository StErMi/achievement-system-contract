# Achievement Contract: Achievement System for the FTM ecosystem

Achievement Contract is a smart contract to create a decentralized achievement system. The concept of the project can be adapted and adopted crypto games, DeFi protocols, DAO and so on.

### What does this enable for the ecosystem?

- Players are more engaged to interact with the platform earning achievements and points
- Contract with achievements will be used more and more in order to earn different achievement rarity
- The overall longevity of the game, DeFi protocol or DAO will increase giving the user a reason to come back and interact with it
- Other contracts / dApp can unlock functions, content or drop NFTs if the user already own an achievement from the same contract or a contract of another game/protocol/DAO (interactions between multiple parties)
- Achievements points earned from a contract could be burned to unlock specific content
- Fantom Foundation could build a wall of fame of users with the higher amount of achievements, achievement points or higher rarity
- Each game, DeFi protocol or DAO can build a wall of fame showcasing and incentivizing other user to climb to the top of the rankings

### For the user

- Track the total amount of achievement points earned while playing games, interacting with DeFi procotols or partecipating in DAO activities
- Track the list of achievements earned
- Display achievements on PaintSwap, Artion or any NFT platform that support ERC721 standard

### For the other contracts/web developers

- Enable a way to award achievements when the user interacts with your contract
- Enable to unlock content if the user has reached a certain amount of achievements points or has unlocked a specific achievement

# How to interact with the contract?

### For smart contract developers that want to register and award achievements

If you want to see an example of a contract that integrate with the `Achievement` contract to implement this use case you can look at [FTMGame.sol](https://github.com/StErMi/achievement-system-contract/blob/main/contracts/utils/FTMGame.sol)

What your contract needs to do is:

First of all, you need to import both the Achievement interface and Model

```ts
import '../IAchievement.sol';
import '../AchievementModel.sol';
```

Save a reference to the Achievement contract like this

`IAchievement _ac;`

Declare the Achievement Metadata ID used by your contract

```ts
uint256 private mobAchievement;
uint256 private miniBossAchievement;
uint256 private bossAchievement;
```

Register your achievement metadata calling `_ac.registerAchievement(achievementMetadata);` for each of your contract’s achievements.

`registerAchievement` takes a `metadata` as input and return the `metadataID` you need to send the contract when you want to award an achievement to a user.

The model of the metadata is like this:

```ts
AchievementModel.Metadata metadata = AchievementModel.Metadata({
    id: 0, // ID here is not important, will be replaced by the AchievementContract
    source: address(this), // source is not important, will be replaced by the AchievementContract
    sourceName: "The nightmare dungeon!",
    rarity: AchievementModel.Rarity.Uncommon,
    title: "Defeated first miniboss",
    description: "You have been brave enough to defeat the Eruptus, the mini boss of 'The Fantom Dungeon'",
    points: 10
})
```

I’ll explain each of those

- `id`is the ID of the metadata. You can pass `0` because it will be replaced by the Achievement contract when you call the registration process
- `source` is your contract’s address
- `sourceName` is the name of your contract. For example `The Fantom Dungeon`, it will be used by web apps to know from which contract the achievement comes.
- `rarity` is how difficult is to get this achievement. It goes from `Common` to `Legendary`
- `title`is the title of the achievement
- `description` is the description of the achievement
- `points` are the number of achievement points that the user will receive when awarded the achievement. Try to be **fair** otherwise, your contract will not be used by other web apps/contracts!

`id` and `source` are optional, they will be replaced by the Achievement contract, other properties are **required**, otherwise, the transaction will revert!

When you have registered all your achievement you just need to award those achievements when the user has done some specific action like for example

- Beaten a difficult boss
- Crafted 100 swords
- Collected 100.000 gold
- Reached level 10
- Defeated 10 times a dungeon
- …

To award an achievement to a user you need to call `_ac.awardAchievement(receiverAddress, achievementMetadataId);`.

Please be aware that:

1.  You can award only achievement that your contract owns
2.  You cannot award multiple time the same achievement to the same user

If you want to be sure that a user already owns an achievement you can call `_ac.hasAchievement(userAddress, achievementMetadataId);`

### For smart contracts that want to unlock content only if the user owns an achievement

If you want to see an example of a contract that integrate with the `Achievement` contract to implement this use case you can look at [Greeting.sol](https://github.com/StErMi/achievement-system-contract/blob/main/contracts/utils/Greeting.sol)

First of all, you need to import both the Achievement interface and Model

```ts
import '../IAchievement.sol';
```

Save a reference to the Achievement contract like this

`IAchievement _ac;`

Store which achievements you want to check in order to unlock your contract's function

```ts
uint256 requiredAchievementMetdataId;
```

Add a function modifier that will check if the user owns an achievement generated by an achievement's metadata

```ts
modifier onlyWithAchievement() {
    require(
        _ac.hasAchievement(msg.sender, requiredAchievementMetdataId),
        "You don't have the required achievement"
    );
    _;
}
```

add that modifier to the function you want to `lock`

```ts
function setGreeting(string memory newGreeting) public onlyWithAchievement {
    greeting = newGreeting;
}
```

Only users that own an achievement generated by that specific metadataId will be able to set a greeting message from your contract!

### For web3 developers / other integration

If you want to build a frontend to list the user achievements you are in the right place. These functions could also be used by other smart contract developers to create derivative contracts.

For example, you could allow a user to craft the ultimate sword only if he owns the achievement unlocked after crafting 100 swords. Or you can allow accessing the final dungeon only if the user owns all the achievements from previous dungeons and so on. Just use your imagination!

Back to web3 devs. You have utility functions you can call:

`getMetadata(uint256 metadataId)` will return a `Metadata` struct with all the information of the requested Achievement metadata

`getAchievement(uint256 achievementId)` will return a `AchievementExpanded` struct with all the information of the requested Achievement

`hasAchievement(address user, uint256 metadataId)` will return a `bool`. It will be `true` if the user owns an achievement generated from a specific `metadataId`.

`getPoints(address user, address[] memory sources)` it will return the total amount of achievement points owned by the user filted by whitelisted sources

The `sources` is an array of whitelisted contracts from which you want to filter the achievements from. For example, you want to get only points gained by `ContractA` and `ContractB` contracts, you just need to pass those addresses as an array.

If you don’t want to filter at all, just pass an empty array like this `[]`

`function getAchievements(address user, address[] memory sources, uint256 offset, uint256 limit)` will return the list of Achievements owned by the user. The `sources` parameter is used for the same reason: get only the achievement awarded from those contract addresses. The `offset` and `limit` parameters are used to paginate the results (because of RPC limitations). Use them only if you get some errors while querying the contract otherwise just pass `0` as the offset and `9999999999` (or any big number) as the limit.

import {ethers, waffle} from 'hardhat';
import chai from 'chai';

import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {FTMGame} from '../typechain-types/FTMGame';
import {Achievement} from '../typechain-types/Achievement';
import {checkAchievementMetadata, createFTMGame} from './utils';

import AchievementArtifact from '../artifacts/contracts/Achievement.sol/Achievement.json';

const {deployContract} = waffle;
const {expect} = chai;

// use(solidity);

describe('FTM Game Block Sandbox Testing', () => {
  let achievementOwner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  let achievementContract: Achievement;
  let ftmGame: FTMGame;

  beforeEach(async () => {
    [achievementOwner, addr1, addr2] = await ethers.getSigners();

    // We get the contract to deploy
    achievementContract = (await deployContract(achievementOwner, AchievementArtifact)) as Achievement;

    // Create a FTM Game Contract
    ftmGame = await createFTMGame(achievementContract, addr1);
  });

  it('Achievements not whitelisted because rarity is not valid', async () => {
    // Deploy achievements
    await ftmGame.setupAchievementsMetadata();

    let metadata = await achievementContract.getMetadata(1);
    checkAchievementMetadata(
      {
        id: 1,
        source: ftmGame.address,
        sourceName: 'The Fantom Dungeon',
        rarity: 0,
        title: 'Defeated first monster',
        description: "You have been brave enough to defeat the first monster of 'The Fantom Dungeon'",
        points: 5,
      },
      metadata,
    );

    metadata = await achievementContract.getMetadata(2);
    checkAchievementMetadata(
      {
        id: 2,
        source: ftmGame.address,
        sourceName: 'The Fantom Dungeon',
        rarity: 1,
        title: 'Defeated first miniboss',
        description: "You have been brave enough to defeat the Eruptus, the mini boss of 'The Fantom Dungeon'",
        points: 10,
      },
      metadata,
    );

    metadata = await achievementContract.getMetadata(3);
    checkAchievementMetadata(
      {
        id: 3,
        source: ftmGame.address,
        sourceName: 'The Fantom Dungeon',
        rarity: 3,
        title: 'Defeated final boss',
        description: "You have been brave enough to defeat Iced Giant, the final boss of 'The Fantom Dungeon'",
        points: 50,
      },
      metadata,
    );
  });

  it('Check that achievements are correctly rewarded to the user', async () => {
    // Deploy achievements
    await ftmGame.setupAchievementsMetadata();

    // Let a user adventure (we're triggering all the events)
    await ftmGame.connect(addr2).adventure();

    // Check everything works as expected
    expect(await achievementContract.getPoints(addr2.address, [])).to.equal(65);
    const achievements = await achievementContract.getAchievements(addr2.address, [], 0, 9999);

    expect(achievements.length).to.equal(3);
    expect(achievements[0].metadata.id).to.equal(1);
    expect(achievements[1].metadata.id).to.equal(2);
    expect(achievements[2].metadata.id).to.equal(3);
  });
});

import {utils} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import chai from 'chai';
import {ethers, waffle} from 'hardhat';

import FTMGameArtifact from '../artifacts/contracts/utils/FTMGame.sol/FTMGame.json';
import {FTMGame} from '../typechain-types/FTMGame';
import {Achievement} from '../typechain-types/Achievement';

const {deployContract} = waffle;
const {expect} = chai;

const checkAchievementMetadata = (achievement: any, contractAchievement: any) => {
  expect(achievement.id).to.equal(contractAchievement.id);
  expect(achievement.rarity).to.equal(contractAchievement.rarity);
  expect(achievement.source).to.equal(contractAchievement.source);
  expect(achievement.sourceName).to.equal(contractAchievement.sourceName);
  expect(achievement.title).to.equal(contractAchievement.title);
  expect(achievement.description).to.equal(contractAchievement.description);
  expect(achievement.points).to.equal(contractAchievement.points);
};

const awardAchievement = async (
  ftmGame: FTMGame,
  ftmGameOwner: SignerWithAddress,
  receiver: SignerWithAddress,
  metadataId: number,
  revertMessage?: string,
) => {
  const txPromise = ftmGame.connect(ftmGameOwner).awardAchievementOnlyDev(receiver.address, metadataId);

  if (revertMessage) {
    await expect(txPromise).to.be.revertedWith(revertMessage);
  } else {
    const tx = await txPromise;
    await tx.wait();
  }
};

const createFTMGame = async (achievementContract: Achievement, fundsSender: SignerWithAddress) => {
  const ftmGame = (await deployContract(fundsSender, FTMGameArtifact, [achievementContract.address])) as FTMGame;

  // Sending funds to the new block
  if (fundsSender) {
    await ftmGame.connect(fundsSender).supplyFunds({
      value: ethers.utils.parseEther('1'),
    });
  }

  return ftmGame;
};

const deployAchievements = async (
  achievementContract: Achievement,
  ftmGameOwner: SignerWithAddress,
  metadatas: any[],
  revertMessage?: string,
) => {
  const ftmGame = await createFTMGame(achievementContract, ftmGameOwner);

  await ethers.provider.send('hardhat_impersonateAccount', [ftmGame.address]);
  const ftmGameSigner = await ethers.getSigner(ftmGame.address);

  for (const meta of metadatas) {
    meta.source = ftmGame.address;
    const txPromise = achievementContract.connect(ftmGameSigner).registerAchievement(meta);
    if (revertMessage) {
      await expect(txPromise).to.be.revertedWith(revertMessage);
    } else {
      const tx = await txPromise;
      await tx.wait();
    }
  }

  await ethers.provider.send('hardhat_stopImpersonatingAccount', [ftmGame.address]);

  return ftmGame;
};

const checkAchievements = async (
  achievementContract: Achievement,
  user: SignerWithAddress,
  expectedTotalPoints: number,
  expectedAchievementsCount: number,
  whitelistedContracts: string[] = [],
) => {
  // Check points
  const acPoints = await achievementContract.getPoints(user.address, whitelistedContracts);
  expect(acPoints).to.equal(expectedTotalPoints);

  // check metadatas
  const achievements: any[] = await achievementContract.getAchievements(user.address, whitelistedContracts, 0, 0);

  expect(achievements.length).to.equal(expectedAchievementsCount);

  for (const [, achievement] of Object.entries(achievements)) {
    const sourceMetadata = await achievementContract.getMetadata(achievement.metadata.id);

    expect(achievement.metadata.title).to.equal(sourceMetadata.title);
    expect(achievement.user).to.eq(user.address);
    expect(achievement.timestamp).to.gt(0);
    expect(achievement.metadata.description).to.equal(sourceMetadata.description);
    expect(achievement.metadata.points).to.equal(sourceMetadata.points);
  }
};

export {checkAchievementMetadata, checkAchievements, deployAchievements, awardAchievement, createFTMGame};

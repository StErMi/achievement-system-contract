import {ethers, waffle} from 'hardhat';
import chai from 'chai';

import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {
  awardAchievement,
  checkAchievementMetadata,
  checkAchievements,
  createFTMGame,
  deployAchievements,
} from './utils';

import AchievementArtifact from '../artifacts/contracts/Achievement.sol/Achievement.json';
import {Achievement} from '../typechain-types/Achievement';
import {achievementMetadatas} from './data';

const {deployContract} = waffle;
const {expect} = chai;

describe('FTM Achievement Testing', () => {
  let achievementOwner: SignerWithAddress;
  let ftmGameOwner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;
  let addr4: SignerWithAddress;
  let addrs: SignerWithAddress[];

  let achievementContract: Achievement;

  beforeEach(async () => {
    [achievementOwner, ftmGameOwner, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners();

    achievementContract = (await deployContract(achievementOwner, AchievementArtifact)) as Achievement;
  });

  describe('Test registerAchievement method', () => {
    const correctMetadata = JSON.parse(JSON.stringify(achievementMetadatas[0]));

    it('Achievements not whitelisted because rarity is not valid', async () => {
      const malformedMetadata = JSON.parse(JSON.stringify(correctMetadata));
      malformedMetadata.rarity = 10;
      await deployAchievements(
        achievementContract,
        ftmGameOwner,
        [malformedMetadata],
        'function was called with incorrect parameters',
      );
    });

    it('Achievements not whitelisted because sourceName is empty', async () => {
      const malformedMetadata = JSON.parse(JSON.stringify(correctMetadata));
      malformedMetadata.sourceName = '';
      await deployAchievements(achievementContract, ftmGameOwner, [malformedMetadata], 'Source Name must not be empty');
    });

    it('Achievements not whitelisted because title is empty', async () => {
      const malformedMetadata = JSON.parse(JSON.stringify(correctMetadata));
      malformedMetadata.title = '';
      await deployAchievements(achievementContract, ftmGameOwner, [malformedMetadata], 'Title must not be empty');
    });

    it('Achievements not whitelisted because description is empty', async () => {
      const malformedMetadata = JSON.parse(JSON.stringify(correctMetadata));
      malformedMetadata.description = '';
      await deployAchievements(achievementContract, ftmGameOwner, [malformedMetadata], 'Description must not be empty');
    });

    it('Achievements not whitelisted because achievement points are less or equal zero', async () => {
      const malformedMetadata = JSON.parse(JSON.stringify(correctMetadata));
      malformedMetadata.points = 0;
      await deployAchievements(achievementContract, ftmGameOwner, [malformedMetadata], 'Points must be greater than 0');
    });

    it('Track the AchievementRegistered event', async () => {
      const metadata = JSON.parse(JSON.stringify(achievementMetadatas[0]));
      const ftmGame = await createFTMGame(achievementContract, ftmGameOwner);
      await ethers.provider.send('hardhat_impersonateAccount', [ftmGame.address]);
      const ftmGameSigner = await ethers.getSigner(ftmGame.address);
      metadata.source = ftmGame.address;
      const txPromise = achievementContract.connect(ftmGameSigner).registerAchievement(metadata);
      await expect(txPromise).to.emit(achievementContract, 'AchievementRegistered');
      await ethers.provider.send('hardhat_stopImpersonatingAccount', [ftmGame.address]);
    });

    it('Achievements whitelisted correctly', async () => {
      await deployAchievements(achievementContract, ftmGameOwner, [achievementMetadatas[0]]);
      await deployAchievements(achievementContract, ftmGameOwner, [achievementMetadatas[1]]);
      await deployAchievements(achievementContract, ftmGameOwner, [achievementMetadatas[2]]);

      checkAchievementMetadata(await achievementContract.getMetadata(1), achievementMetadatas[0]);
      checkAchievementMetadata(await achievementContract.getMetadata(2), achievementMetadatas[1]);
      checkAchievementMetadata(await achievementContract.getMetadata(3), achievementMetadatas[2]);
    });
  });

  describe('Test awardAchievement method', () => {
    it('Award an achievement that does not exist', async () => {
      const ftmGame = await deployAchievements(achievementContract, ftmGameOwner, achievementMetadatas);
      await awardAchievement(ftmGame, ftmGameOwner, addr1, 30, 'Requested metadata not exist');
    });

    it('Award an achievement that your contract does not own', async () => {
      const anotherftmGame = await createFTMGame(achievementContract, ftmGameOwner);

      await deployAchievements(achievementContract, ftmGameOwner, achievementMetadatas);
      await awardAchievement(anotherftmGame, ftmGameOwner, addr1, 1, 'You are not the owner of the metadata');
    });

    it('Award the same achievement to the same summoner', async () => {
      const ftmGame = await deployAchievements(achievementContract, ftmGameOwner, achievementMetadatas);
      await awardAchievement(ftmGame, ftmGameOwner, addr1, 1);
      await awardAchievement(ftmGame, ftmGameOwner, addr2, 1);
      await awardAchievement(ftmGame, ftmGameOwner, addr1, 1, 'Wallet already own the achievement');
    });

    it('Award the achievement to the source itself', async () => {
      const ftmGame = await deployAchievements(achievementContract, ftmGameOwner, achievementMetadatas);
      await awardAchievement(
        ftmGame,
        ftmGameOwner,
        await ethers.getSigner(ftmGame.address),
        1,
        "Source can't award itself",
      );
    });

    it('Award an achievement to a summoner successfully', async () => {
      const ftmGame = await deployAchievements(achievementContract, ftmGameOwner, achievementMetadatas);
      const ftmGame2 = await deployAchievements(achievementContract, ftmGameOwner, achievementMetadatas);

      await awardAchievement(ftmGame, ftmGameOwner, addr1, 1);
      await awardAchievement(ftmGame, ftmGameOwner, addr1, 2);
      await awardAchievement(ftmGame, ftmGameOwner, addr1, 3);
      await awardAchievement(ftmGame, ftmGameOwner, addr2, 1);

      await awardAchievement(ftmGame2, ftmGameOwner, addr1, 4);
      await awardAchievement(ftmGame2, ftmGameOwner, addr1, 5);
      await awardAchievement(ftmGame2, ftmGameOwner, addr2, 4);
      await awardAchievement(ftmGame2, ftmGameOwner, addr2, 6);

      await checkAchievements(achievementContract, addr1, 80, 5);
      await checkAchievements(achievementContract, addr2, 60, 3);
      await checkAchievements(achievementContract, addr3, 0, 0);
    });

    it('Track the AchievementAwarded event', async () => {
      const metadata = achievementMetadatas[0];
      const ftmGame = await deployAchievements(achievementContract, ftmGameOwner, achievementMetadatas);

      await ethers.provider.send('hardhat_impersonateAccount', [ftmGame.address]);
      const ftmGameSigner = await ethers.getSigner(ftmGame.address);

      const txPromise = achievementContract.connect(ftmGameSigner).awardAchievement(addr1.address, metadata.id);
      await expect(txPromise).to.emit(achievementContract, 'AchievementAwarded');

      await ethers.provider.send('hardhat_stopImpersonatingAccount', [ftmGame.address]);
    });
  });

  describe('Test utility methods', () => {
    it('Test hasAchievement, check if summoner has an achievement awarded', async () => {
      const ftmGame = await deployAchievements(achievementContract, ftmGameOwner, achievementMetadatas);
      await awardAchievement(ftmGame, ftmGameOwner, addr1, 1);
      const summoner1HasAchievement = await achievementContract.hasAchievement(addr1.address, 1);
      expect(summoner1HasAchievement).to.equal(true);
      const summoner2HasAchievement = await achievementContract.hasAchievement(addr2.address, 1);
      expect(summoner2HasAchievement).to.equal(false);
    });
    it('Test hasAchievement on not existing summoner', async () => {
      await deployAchievements(achievementContract, ftmGameOwner, achievementMetadatas);
      const summoner1HasAchievement = await achievementContract.hasAchievement(addr4.address, 1);
      expect(summoner1HasAchievement).to.equal(false);
    });
    it('Test hasAchievement on not existing achievement', async () => {
      const summoner1HasAchievement = await achievementContract.hasAchievement(addr1.address, 1000);
      expect(summoner1HasAchievement).to.equal(false);
    });
    it('Test getPoints on not existing summoner', async () => {
      await deployAchievements(achievementContract, ftmGameOwner, achievementMetadatas);
      const points = await achievementContract.getPoints(addr4.address, []);
      expect(points).to.equal(0);
    });
    it('Test getPoints on not existing source', async () => {
      const points = await achievementContract.getPoints(addr1.address, ['0x2BA751061D82284b42B4C83E38541c293ebd265A']);
      expect(points).to.equal(0);
    });
    it('Test getAchievements on not existing summoner', async () => {
      await deployAchievements(achievementContract, ftmGameOwner, achievementMetadatas);
      const achievements = await achievementContract.getAchievements(addr4.address, [], 0, 99999);
      expect(achievements.length).to.equal(0);
    });
    it('Test getAchievements on not existing source', async () => {
      const achievements = await achievementContract.getAchievements(
        addr4.address,
        ['0x2BA751061D82284b42B4C83E38541c293ebd265A'],
        0,
        99999,
      );
      expect(achievements.length).to.equal(0);
    });
    it('Test getAchievements, get a list of achievements filterable by source', async () => {
      const ftmGame1 = await deployAchievements(achievementContract, ftmGameOwner, achievementMetadatas);
      const ftmGame2 = await deployAchievements(achievementContract, ftmGameOwner, achievementMetadatas);
      const ftmGame3 = await deployAchievements(achievementContract, ftmGameOwner, achievementMetadatas);
      await awardAchievement(ftmGame1, ftmGameOwner, addr1, 1);
      await awardAchievement(ftmGame1, ftmGameOwner, addr1, 2);
      await awardAchievement(ftmGame2, ftmGameOwner, addr1, 4);
      await awardAchievement(ftmGame2, ftmGameOwner, addr1, 5);
      await awardAchievement(ftmGame2, ftmGameOwner, addr1, 6);
      await awardAchievement(ftmGame1, ftmGameOwner, addr2, 1);
      await awardAchievement(ftmGame1, ftmGameOwner, addr2, 2);
      await awardAchievement(ftmGame2, ftmGameOwner, addr2, 6);
      // Check points
      expect(await achievementContract.getPoints(addr1.address, [])).to.equal(80);
      expect(await achievementContract.getPoints(addr1.address, [ftmGame1.address])).to.equal(15);
      expect(await achievementContract.getPoints(addr1.address, [ftmGame2.address])).to.equal(65);
      expect(await achievementContract.getPoints(addr1.address, [ftmGame3.address])).to.equal(0);
      expect(await achievementContract.getPoints(addr2.address, [])).to.equal(65);
      expect(await achievementContract.getPoints(addr2.address, [ftmGame1.address])).to.equal(15);
      expect(await achievementContract.getPoints(addr2.address, [ftmGame2.address])).to.equal(50);
      expect(await achievementContract.getPoints(addr2.address, [ftmGame3.address])).to.equal(0);
      // Get achievements without whitelisting, wihtout limits
      const summoner1AllAchievements = await achievementContract.getAchievements(addr1.address, [], 0, 9999);
      expect(summoner1AllAchievements.length).to.equal(5);
      // // Get achievements without whitelisting, wihtout limits
      let summoner1LimitedAchievements = await achievementContract.getAchievements(addr1.address, [], 0, 1);
      expect(summoner1LimitedAchievements.length).to.equal(1);
      expect(summoner1LimitedAchievements[0].metadata.id).to.equal(1);
      summoner1LimitedAchievements = await achievementContract.getAchievements(addr1.address, [], 1, 1);
      expect(summoner1LimitedAchievements.length).to.equal(1);
      expect(summoner1LimitedAchievements[0].metadata.id).to.equal(2);
      summoner1LimitedAchievements = await achievementContract.getAchievements(addr1.address, [], 2, 9999);
      expect(summoner1LimitedAchievements.length).to.equal(3);
      expect(summoner1LimitedAchievements[0].metadata.id).to.equal(4);
      expect(summoner1LimitedAchievements[1].metadata.id).to.equal(5);
      expect(summoner1LimitedAchievements[2].metadata.id).to.equal(6);
      // Get achievements with whitelisting, wihtout limits
      let summoner1AllFiltered = await achievementContract.getAchievements(addr1.address, [ftmGame2.address], 0, 9999);
      expect(summoner1AllFiltered.length).to.equal(3);
      expect(summoner1LimitedAchievements[0].metadata.id).to.equal(4);
      expect(summoner1LimitedAchievements[1].metadata.id).to.equal(5);
      expect(summoner1LimitedAchievements[2].metadata.id).to.equal(6);
      summoner1AllFiltered = await achievementContract.getAchievements(addr1.address, [ftmGame2.address], 1, 9999);
      expect(summoner1AllFiltered.length).to.equal(2);
      expect(summoner1LimitedAchievements[1].metadata.id).to.equal(5);
      expect(summoner1LimitedAchievements[2].metadata.id).to.equal(6);
      // Offset greater than remaining
      const txOffsetGreaterThanAchievementNumber = achievementContract.getAchievements(
        addr1.address,
        [ftmGame2.address],
        10,
        9999,
      );
      await expect(txOffsetGreaterThanAchievementNumber).to.be.revertedWith(
        'Offset is greater than number of records available',
      );
      const summoner1NoSource = await achievementContract.getAchievements(addr1.address, [ftmGame3.address], 0, 9999);
      expect(summoner1NoSource.length).to.equal(0);
    });
  });
});

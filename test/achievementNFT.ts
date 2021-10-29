import {ethers, waffle} from 'hardhat';
import chai from 'chai';

import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {FTMGame} from '../typechain-types/FTMGame';
import {Achievement} from '../typechain-types/Achievement';
import {awardAchievement, deployAchievements} from './utils';

import AchievementArtifact from '../artifacts/contracts/Achievement.sol/Achievement.json';
import {achievementMetadatas} from './data';

const {deployContract} = waffle;
const {expect} = chai;

// use(solidity);

describe('NFT Archievement', () => {
  let achievementOwner: SignerWithAddress;
  let ftmGameOwner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;
  let addr4: SignerWithAddress;
  let addrs: SignerWithAddress[];

  let achievementContract: Achievement;
  let ftmGame: FTMGame;

  beforeEach(async () => {
    [achievementOwner, ftmGameOwner, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners();

    achievementContract = (await deployContract(achievementOwner, AchievementArtifact)) as Achievement;
    ftmGame = await deployAchievements(achievementContract, ftmGameOwner, achievementMetadatas);
  });

  it('Achievement cannot be transferred to another user', async () => {
    await awardAchievement(ftmGame, ftmGameOwner, addr1, 1);
    const tx = achievementContract.connect(addr1).transferFrom(addr1.address, addr2.address, 0);
    await expect(tx).to.be.revertedWith('The Archievement NFT is soul bound to the user');

    const tx2 = achievementContract
      .connect(addr1)
      ['safeTransferFrom(address,address,uint256)'](addr1.address, addr2.address, 0);
    await expect(tx2).to.be.revertedWith('The Archievement NFT is soul bound to the user');
  });
});

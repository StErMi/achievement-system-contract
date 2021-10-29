import {ethers, waffle} from 'hardhat';
import chai from 'chai';

import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {FTMGame} from '../typechain-types/FTMGame';
import {Achievement} from '../typechain-types/Achievement';
import {Greeting} from '../typechain-types/Greeting';
import {awardAchievement, deployAchievements} from './utils';

import AchievementArtifact from '../artifacts/contracts/Achievement.sol/Achievement.json';
import GreetingArtifact from '../artifacts/contracts/utils/Greeting.sol/Greeting.json';
import {achievementMetadatas} from './data';

const {deployContract} = waffle;
const {expect} = chai;

// use(solidity);

describe('NFT Archievement', () => {
  let achievementOwner: SignerWithAddress;
  let ftmGameOwner: SignerWithAddress;
  let greetingOwner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;
  let addrs: SignerWithAddress[];

  let achievementContract: Achievement;
  let ftmGame: FTMGame;
  let greeting: Greeting;

  beforeEach(async () => {
    [achievementOwner, ftmGameOwner, greetingOwner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    achievementContract = (await deployContract(achievementOwner, AchievementArtifact)) as Achievement;
    ftmGame = await deployAchievements(achievementContract, ftmGameOwner, achievementMetadatas);

    greeting = (await deployContract(greetingOwner, GreetingArtifact, [achievementContract.address, 1])) as Greeting;
  });

  it("Cannot set the message if you don't own the achievement", async () => {
    const tx = greeting.connect(addr1).setGreeting('Hi there everyone!');
    await expect(tx).to.be.revertedWith("You don't have the required achievement");
  });

  it('Double check that you need the specific achievement', async () => {
    await awardAchievement(ftmGame, ftmGameOwner, addr1, 2);

    const tx = greeting.connect(addr1).setGreeting('Hi there everyone!');
    await expect(tx).to.be.revertedWith("You don't have the required achievement");
  });

  it('Check that the user cannot set a greeting message without the achievement', async () => {
    const newGreeting = 'Hi there everyone!';

    // Award the achievement needed to unlock it
    await awardAchievement(ftmGame, ftmGameOwner, addr1, 1);

    // Set the greeting
    await greeting.connect(addr1).setGreeting(newGreeting);

    // Check the greeting
    const contractGreeting = await greeting.greeting();
    expect(contractGreeting).to.equal(newGreeting);
  });
});

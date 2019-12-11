import {RestApi} from "../../../../../src/api/rest";
import {ApiNamespace} from "../../../../../src/api";
import sinon from "sinon";
import {WinstonLogger} from "../../../../../src/logger";
import {BeaconChain} from "../../../../../src/chain";
import {BeaconDb} from "../../../../../src/db/api";
import {config} from "@chainsafe/eth2.0-config/lib/presets/minimal";
import {EthersEth1Notifier} from "../../../../../src/eth1";
import supertest from "supertest";
import {Sync} from "../../../../../src/sync";
import * as validatorImpl from "../../../../../src/api/impl/validator";
import {generateEmptyValidatorDuty} from "../../../../../src/chain/factory/duties";
import {expect} from "chai";
import {generateEmptyBlock} from "../../../../utils/block";
import * as blockUtils from "../../../../../src/chain/factory/block";
import {generateAttestationData, generateEmptyAttestation} from "../../../../utils/attestation";
import {IndexedAttestation} from "@chainsafe/eth2.0-types";
import {AttestationOperations, OpPool} from "../../../../../src/opPool";
import {toHex, toJson} from "@chainsafe/eth2.0-utils";
import {after, afterEach, before, beforeEach, describe, it} from "mocha";
import {Keypair} from "@chainsafe/bls";

describe("Test validator rest API", function () {
  this.timeout(10000);

  let restApi: RestApi,
    getAttesterDuties: any,
    assembleBlockStub: any,
    produceAttestationStub: any,
    getProposerDutiesStub: any;

  const chain = sinon.createStubInstance(BeaconChain);
  const opPool = sinon.createStubInstance(OpPool);
  const attestationOperations = sinon.createStubInstance(AttestationOperations);
  // @ts-ignore
  opPool.attestations = attestationOperations;
  const sync = sinon.createStubInstance(Sync);
  const sandbox = sinon.createSandbox();

  before(async function () {
    restApi = new RestApi({
      api: [ApiNamespace.VALIDATOR],
      cors: "*",
      enabled: true,
      host: "127.0.0.1",
      port: 0
    }, {
      logger: sandbox.createStubInstance(WinstonLogger),
      chain,
      // @ts-ignore
      sync,
      // @ts-ignore
      opPool,
      db: sinon.createStubInstance(BeaconDb),
      config,
      eth1: sinon.createStubInstance(EthersEth1Notifier),
    });
    return await restApi.start();
  });

  after(async function () {
    return await restApi.stop();
  });

  beforeEach(function () {
    getAttesterDuties = sandbox.stub(validatorImpl, "getAttesterDuties");
    getProposerDutiesStub = sandbox.stub(validatorImpl, "getEpochProposers");
    assembleBlockStub = sandbox.stub(blockUtils, "assembleBlock");
    produceAttestationStub = sandbox.stub(validatorImpl, "produceAttestation");
  });

  afterEach(function () {
    sandbox.restore();
  });

  it("should return proposer duties", async function () {
    getProposerDutiesStub.resolves(new Map([[1, Buffer.alloc(48)]]));
    const response = await supertest(restApi.server.server)
      .get(
        "/validator/duties/proposer/2",
      )
      .expect(200)
      .expect("Content-Type", "application/json; charset=utf-8");
    expect(response.body[1]).to.be.equal(toHex(Buffer.alloc(48)));
    expect(getProposerDutiesStub.withArgs(sinon.match.any, sinon.match.any, 2).calledOnce).to.be.true;
  });

  it("should return attester duties", async function () {
    const publicKey1= Keypair.generate().publicKey.toBytesCompressed();
    const publicKey2= Buffer.alloc(48, 1);
    getAttesterDuties.resolves([generateEmptyValidatorDuty(Buffer.alloc(48, 1))]);
    const response = await supertest(restApi.server.server)
      .get(
        "/validator/duties/attester/2",
      )
      .query({"validator_pubkeys[]": [toHex(publicKey1), toHex(publicKey2)]})
      .expect(200)
      .expect("Content-Type", "application/json; charset=utf-8");
    expect(response.body.length).to.be.equal(1);
    expect(getAttesterDuties.withArgs(sinon.match.any, sinon.match.any, 2, [publicKey1]).calledOnce).to.be.true;
  });

  it("should throw error on invalid request for block production", async function () {
    await supertest(restApi.server.server)
      .get("/validator/block")
      .expect(400)
      .expect("Content-Type", "application/json; charset=utf-8");
  });

  it("should return new block", async function () {
    const block = generateEmptyBlock();
    assembleBlockStub.resolves(block);
    const response = await supertest(restApi.server.server)
      .get(
        "/validator/block",
      )
      .query({
        "randao_reveal": toHex(Buffer.alloc(32)),
        slot: 2
      })
      .expect(200)
      .expect("Content-Type", "application/json; charset=utf-8");
    expect(response.body.parent_root).to.not.be.null;
  });

  it("should publish block", async function () {
    const block = generateEmptyBlock();
    chain.receiveBlock.resolves();
    await supertest(restApi.server.server)
      .post(
        "/validator/block",
      )
      .send({
        "beacon_block": toJson(block)
      })
      .expect(200)
      .expect("Content-Type", "application/json");
    expect(chain.receiveBlock.calledOnce).to.be.true;
  });

  it("should produce attestation", async function () {
    const attestation: IndexedAttestation = {
      attestingIndices: [],
      data: generateAttestationData(0, 1),
      signature: null
    };
    produceAttestationStub.resolves(attestation);
    await supertest(restApi.server.server)
      .get(
        "/validator/attestation",
      )
      .query({
        "validator_pubkey": toHex(Buffer.alloc(48)),
        "poc_bit": 1,
        "shard": 3,
        "slot": 2
      })
      .expect(200)
      .expect("Content-Type", "application/json; charset=utf-8");
    expect(produceAttestationStub.withArgs(sinon.match.any, sinon.match.any, 3, 2).calledOnce).to.be.true;
  });


  it("should publish attestation", async function () {
    const attestation = generateEmptyAttestation();
    attestationOperations.receive.resolves();
    await supertest(restApi.server.server)
      .post(
        "/validator/attestation",
      )
      .send({
        "attestation": toJson(attestation)
      })
      .expect(200)
      .expect("Content-Type", "application/json");
    expect(attestationOperations.receive.calledOnce).to.be.true;
  });

});
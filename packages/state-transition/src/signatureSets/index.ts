import {ForkSeq} from "@lodestar/params";
import {allForks, altair, capella, electra} from "@lodestar/types";
import {ISignatureSet} from "../util/index.js";
import {CachedBeaconStateAllForks, CachedBeaconStateAltair, CachedBeaconStateElectra} from "../types.js";
import {getSyncCommitteeSignatureSet} from "../block/processSyncCommittee.js";
import {getProposerSlashingsSignatureSets} from "./proposerSlashings.js";
import {getAttesterSlashingsSignatureSets} from "./attesterSlashings.js";
import {getAttestationsSignatureSets} from "./indexedAttestation.js";
import {getBlockProposerSignatureSet} from "./proposer.js";
import {getRandaoRevealSignatureSet} from "./randao.js";
import {getVoluntaryExitsSignatureSets} from "./voluntaryExits.js";
import {getBlsToExecutionChangeSignatureSets} from "./blsToExecutionChange.js";
import {getConsolidationSignatureSets} from "./consolidation.js";

export * from "./attesterSlashings.js";
export * from "./indexedAttestation.js";
export * from "./proposer.js";
export * from "./proposerSlashings.js";
export * from "./randao.js";
export * from "./voluntaryExits.js";
export * from "./blsToExecutionChange.js";
export * from "./consolidation.js";

/**
 * Includes all signatures on the block (except the deposit signatures) for verification.
 * Deposits are not included because they can legally have invalid signatures.
 */
export function getBlockSignatureSets(
  state: CachedBeaconStateAllForks,
  signedBlock: allForks.SignedBeaconBlock,
  opts?: {
    /** Useful since block proposer signature is verified beforehand on gossip validation */
    skipProposerSignature?: boolean;
  }
): ISignatureSet[] {
  const signatureSets = [
    getRandaoRevealSignatureSet(state, signedBlock.message),
    ...getProposerSlashingsSignatureSets(state, signedBlock),
    ...getAttesterSlashingsSignatureSets(state, signedBlock),
    ...getAttestationsSignatureSets(state, signedBlock),
    ...getVoluntaryExitsSignatureSets(state, signedBlock),
  ];

  if (!opts?.skipProposerSignature) {
    signatureSets.push(getBlockProposerSignatureSet(state, signedBlock));
  }

  // fork based validations
  const fork = state.config.getForkSeq(signedBlock.message.slot);

  // Only after altair fork, validate tSyncCommitteeSignature
  if (fork >= ForkSeq.altair) {
    const syncCommitteeSignatureSet = getSyncCommitteeSignatureSet(
      state as CachedBeaconStateAltair,
      (signedBlock as altair.SignedBeaconBlock).message
    );
    // There may be no participants in this syncCommitteeSignature, so it must not be validated
    if (syncCommitteeSignatureSet) {
      signatureSets.push(syncCommitteeSignatureSet);
    }
  }

  // only after capella fork
  if (fork >= ForkSeq.capella) {
    const blsToExecutionChangeSignatureSets = getBlsToExecutionChangeSignatureSets(
      state.config,
      signedBlock as capella.SignedBeaconBlock
    );
    if (blsToExecutionChangeSignatureSets.length > 0) {
      signatureSets.push(...blsToExecutionChangeSignatureSets);
    }
  }

  if (fork >= ForkSeq.electra) {
    const consolidationSignatureSets = getConsolidationSignatureSets(
      state as CachedBeaconStateElectra,
      signedBlock as electra.SignedBeaconBlock
    );
    if (consolidationSignatureSets.length > 0) {
      signatureSets.push(...consolidationSignatureSets);
    }
  }

  return signatureSets;
}

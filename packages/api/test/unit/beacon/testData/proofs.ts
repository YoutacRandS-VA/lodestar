import {ProofType} from "@chainsafe/persistent-merkle-tree";
import {ForkName} from "@lodestar/params";
import {Endpoints} from "../../../../src/beacon/routes/proof.js";
import {GenericServerTestCases} from "../../../utils/genericServerTest.js";

const root = Uint8Array.from(Buffer.alloc(32, 1));
const descriptor = Uint8Array.from([0, 0, 0, 0]);

export const testData: GenericServerTestCases<Endpoints> = {
  getStateProof: {
    args: {stateId: "head", descriptor},
    res: {
      data: {
        type: ProofType.compactMulti,
        descriptor,
        leaves: [root, root, root, root],
      },
      meta: {version: ForkName.altair},
    },
    query: {
      format: "0x00000000",
    },
  },
  getBlockProof: {
    args: {blockId: "head", descriptor},
    res: {
      data: {
        type: ProofType.compactMulti,
        descriptor,
        leaves: [root, root, root, root],
      },
      meta: {version: ForkName.altair},
    },
    query: {
      format: "0x00000000",
    },
  },
};

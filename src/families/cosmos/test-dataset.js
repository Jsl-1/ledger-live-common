// @flow

import { BigNumber } from "bignumber.js";
import type { DatasetTest } from "../../__tests__/test-helpers/bridge";
import {
  InvalidAddress,
  InvalidAddressBecauseDestinationIsAlsoSource,
  NotEnoughBalance,
  AmountRequired,
} from "@ledgerhq/errors";
import { CosmosClaimRewardsFeesWarning } from "../../errors";
import invariant from "invariant";
import type { Transaction } from "./types";
import transactionTransformer from "./transaction";
import { getEnv } from "../../env";

const dataset: DatasetTest<Transaction> = {
  implementations: ["libcore"],
  // TODO re-enable when libcore is fixed
  currencies: {
    cosmos: {
      FIXME_ignoreAccountFields: [
        "cosmosResources.unbondingBalance", // They move once all unbonding are done
        "cosmosResources.pendingRewardsBalance", // They are always movings
        "cosmosResources.delegations", // They are always movings because of pending Rewards
        "cosmosResources.redelegations", // will change ince a redelegation it's done
        "cosmosResources.unbondings", // will change once a unbonding it's done
        "spendableBalance", // will change with the rewards that automatically up
      ],
      scanAccounts: [
        {
          name: "cosmos seed 1",
          apdus: `
              => 550400001b06636f736d6f732c00008076000080000000800000000000000000
              <= 0388459b2653519948b12492f1a0b464720110c147a8155d23d423a5cc3c21d89a636f736d6f73316738343933346a70753376356465357971756b6b6b68786d63767377337532616a787670646c9000
              => 550400001b06636f736d6f732c00008076000080000000800000000000000000
              <= 0388459b2653519948b12492f1a0b464720110c147a8155d23d423a5cc3c21d89a636f736d6f73316738343933346a70753376356465357971756b6b6b68786d63767377337532616a787670646c9000
              => 550400001b06636f736d6f732c00008076000080010000800000000000000000
              <= 02624ac83690d5ef627927104767d679aef73d3d3c9544abe4206b1d0c463c94ff636f736d6f7331303875793571396a743539677775677135797264686b7a6364396a7279736c6d706373746b359000
              => 550400001b06636f736d6f732c00008076000080020000800000000000000000
              <= 038ff98278402aa3e46ccfd020561dc9724ab63d7179ca507c8154b5257c7d5200636f736d6f733163676336393661793270673664346763656a656b3279386c6136366a376535793363376b79779000
              => 550400001b06636f736d6f732c00008076000080030000800000000000000000
              <= 02ecca2a8c647b50bcea2cb4667bb8b2c5f5b2b8439d51c842bc9fd20c4185a95c636f736d6f73313474673476736430713734356678687a6e333239706b78306b727174737a6378797a6c356b759000
          `,
        },
      ],
      accounts: [
        {
          FIXME_tests: ["balance is sum of ops"],
          raw: {
            id:
              "libcore:1:cosmos:cosmospub1addwnpepqwyytxex2dgejj93yjf0rg95v3eqzyxpg75p2hfr6s36tnpuy8vf5p6kez4:",
            seedIdentifier:
              "0388459b2653519948b12492f1a0b464720110c147a8155d23d423a5cc3c21d89a",
            xpub:
              "cosmospub1addwnpepqwyytxex2dgejj93yjf0rg95v3eqzyxpg75p2hfr6s36tnpuy8vf5p6kez4",
            derivationMode: "",
            index: 0,
            freshAddress: "cosmos1g84934jpu3v5de5yqukkkhxmcvsw3u2ajxvpdl",
            freshAddressPath: "44'/118'/0'/0/0",
            freshAddresses: [
              {
                address: "cosmos1g84934jpu3v5de5yqukkkhxmcvsw3u2ajxvpdl",
                derivationPath: "44'/118'/0'/0/0",
              },
            ],
            name: "Cosmos 1",
            balance: "2180673",
            spendableBalance: "2180673",
            blockHeight: 1615299,
            currencyId: "cosmos",
            unit: { name: "Atom", code: "ATOM", magnitude: 6 },
            unitMagnitude: 6,
            operationsCount: 85,
            operations: [],
            pendingOperations: [],
            lastSyncDate: "",
          },
          transactions: [
            {
              name: "Same as Recipient",
              transaction: (t) => ({
                ...t,
                amount: BigNumber(100),
                recipient: "cosmos1g84934jpu3v5de5yqukkkhxmcvsw3u2ajxvpdl",
              }),
              expectedStatus: {
                errors: {
                  recipient: new InvalidAddressBecauseDestinationIsAlsoSource(),
                },
                warnings: {},
              },
            },
            {
              name: "Invalid Address",
              transaction: (t) => ({
                ...t,
                amount: BigNumber(100),
                recipient: "dsadasdasdasdas",
              }),
              expectedStatus: {
                errors: {
                  recipient: new InvalidAddress(),
                },
                warnings: {},
              },
            },
            {
              name: "GasLimit",
              transaction: (t) => ({
                ...t,
                amount: BigNumber(100),
                recipient: "cosmos108uy5q9jt59gwugq5yrdhkzcd9jryslmpcstk5",
                gasLimit: BigNumber("10000"),
              }),
              expectedStatus: {
                errors: {},
                warnings: {},
                estimatedFees: BigNumber("10000").multipliedBy(
                  getEnv("COSMOS_GAS_PRICE")
                ),
              },
            },
            {
              name: "Fees",
              transaction: (t) => ({
                ...t,
                amount: BigNumber(100),
                recipient: "cosmos108uy5q9jt59gwugq5yrdhkzcd9jryslmpcstk5",
                fees: BigNumber("10000"),
              }),
              expectedStatus: {
                errors: {},
                warnings: {},
                estimatedFees: BigNumber("10000"),
              },
            },
            {
              name: "send max",
              transaction: transactionTransformer.fromTransactionRaw({
                amount: "0",
                recipient: "cosmos108uy5q9jt59gwugq5yrdhkzcd9jryslmpcstk5",
                useAllAmount: true,
                family: "cosmos",
                networkInfo: null,
                validators: [],
                cosmosSourceValidator: null,
                fees: null,
                gasLimit: "0",
                memo: null,
                mode: "send",
              }),
              expectedStatus: (account) => {
                const { cosmosResources } = account;
                invariant(cosmosResources, "Should exist because it's cosmos");
                const totalSpent = account.balance.minus(
                  cosmosResources.unbondingBalance.plus(
                    cosmosResources.delegatedBalance
                  )
                );
                return {
                  errors: {},
                  warnings: {},
                  totalSpent,
                };
              },
            },
            {
              name: "send with memo",
              transaction: transactionTransformer.fromTransactionRaw({
                amount: "0",
                recipient: "cosmos108uy5q9jt59gwugq5yrdhkzcd9jryslmpcstk5",
                useAllAmount: true,
                family: "cosmos",
                networkInfo: null,
                validators: [],
                cosmosSourceValidator: null,
                fees: null,
                gasLimit: "0",
                memo: "test",
                mode: "send",
              }),
              expectedStatus: (account) => {
                const { cosmosResources } = account;
                invariant(cosmosResources, "Should exist because it's cosmos");
                const totalSpent = account.balance.minus(
                  cosmosResources.unbondingBalance.plus(
                    cosmosResources.delegatedBalance
                  )
                );
                return {
                  errors: {},
                  warnings: {},
                  totalSpent,
                };
              },
            },
            {
              name: "Not Enough balance",
              transaction: (t) => ({
                ...t,
                amount: BigNumber("99999999999999999"),
                recipient: "cosmos108uy5q9jt59gwugq5yrdhkzcd9jryslmpcstk5",
              }),
              expectedStatus: {
                errors: {
                  amount: new NotEnoughBalance(),
                },
                warnings: {},
              },
            },
            {
              name: "Redelegation - success",
              transaction: (t) => ({
                ...t,
                amount: BigNumber(100),
                validators: [
                  {
                    address:
                      "cosmosvaloper1grgelyng2v6v3t8z87wu3sxgt9m5s03xfytvz7",
                    amount: BigNumber(100),
                  },
                ],
                cosmosSourceValidator:
                  "cosmosvaloper1sd4tl9aljmmezzudugs7zlaya7pg2895ws8tfs",
                mode: "redelegate",
              }),
              expectedStatus: {
                errors: {},
                warnings: {},
              },
            },
            {
              name: "redelegation - AmountRequired",
              transaction: (t) => ({
                ...t,
                mode: "redelegate",
                validators: [
                  {
                    address:
                      "cosmosvaloper1grgelyng2v6v3t8z87wu3sxgt9m5s03xfytvz7",
                    amount: BigNumber(0),
                  },
                ],
                cosmosSourceValidator:
                  "cosmosvaloper1sd4tl9aljmmezzudugs7zlaya7pg2895ws8tfs",
              }),
              expectedStatus: {
                errors: { amount: new AmountRequired() },
                warnings: {},
              },
            },
            {
              name: "redelegation - Source is Destination",
              transaction: (t) => ({
                ...t,
                mode: "redelegate",
                validators: [
                  {
                    address:
                      "cosmosvaloper1sd4tl9aljmmezzudugs7zlaya7pg2895ws8tfs",
                    amount: BigNumber(100),
                  },
                ],
                cosmosSourceValidator:
                  "cosmosvaloper1sd4tl9aljmmezzudugs7zlaya7pg2895ws8tfs",
              }),
              expectedStatus: {
                errors: {
                  redelegation: new InvalidAddressBecauseDestinationIsAlsoSource(),
                },
                warnings: {},
              },
            },
            {
              name: "Unbonding - success",
              transaction: (t) => ({
                ...t,
                mode: "undelegate",
                validators: [
                  {
                    address:
                      "cosmosvaloper1grgelyng2v6v3t8z87wu3sxgt9m5s03xfytvz7",
                    amount: BigNumber(100),
                  },
                ],
              }),
              expectedStatus: {
                errors: {},
                warnings: {},
              },
            },
            {
              name: "Unbonding - AmountRequired",
              transaction: (t) => ({
                ...t,
                mode: "undelegate",
                validators: [
                  {
                    address:
                      "cosmosvaloper1grgelyng2v6v3t8z87wu3sxgt9m5s03xfytvz7",
                    amount: BigNumber(0),
                  },
                ],
              }),
              expectedStatus: {
                errors: { amount: new AmountRequired() },
                warnings: {},
              },
            },
            {
              name: "Delegate - success",
              transaction: (t) => ({
                ...t,
                mode: "delegate",
                validators: [
                  {
                    address:
                      "cosmosvaloper1grgelyng2v6v3t8z87wu3sxgt9m5s03xfytvz7",
                    amount: BigNumber(100),
                  },
                ],
              }),
              expectedStatus: {
                errors: {},
                warnings: {},
              },
            },
            {
              name: "Delegate - not a valid",
              transaction: (t) => ({
                ...t,
                mode: "delegate",
                validators: [
                  {
                    address: "cosmos108uy5q9jt59gwugq5yrdhkzcd9jryslmpcstk5",
                    amount: BigNumber(100),
                  },
                ],
              }),
              expectedStatus: {
                errors: { recipient: new InvalidAddress() },
                warnings: {},
              },
            },
            {
              name: "ClaimReward - success",
              transaction: (t) => ({
                ...t,
                validators: [
                  {
                    address:
                      "cosmosvaloper1grgelyng2v6v3t8z87wu3sxgt9m5s03xfytvz7",
                    amount: BigNumber(0),
                  },
                ],
                mode: "claimReward",
              }),
              expectedStatus: {
                errors: {},
                warnings: {},
              },
            },
            {
              name: "ClaimReward - Warning",
              transaction: (t) => ({
                ...t,
                validators: [
                  {
                    address:
                      "cosmosvaloper1grgelyng2v6v3t8z87wu3sxgt9m5s03xfytvz7",
                    amount: BigNumber(0),
                  },
                ],
                fees: BigNumber(9999999999999999),
                mode: "claimReward",
              }),
              expectedStatus: {
                errors: {},
                warnings: { claimReward: new CosmosClaimRewardsFeesWarning() },
              },
            },
            {
              name: "ClaimReward - not a cosmosvaloper",
              transaction: (t) => ({
                ...t,
                validators: [
                  {
                    address: "cosmos108uy5q9jt59gwugq5yrdhkzcd9jryslmpcstk5",
                    amount: BigNumber(0),
                  },
                ],
                mode: "claimReward",
              }),
              expectedStatus: {
                errors: { recipient: new InvalidAddress() },
                warnings: {},
              },
            },
            {
              name: "claimRewardCompound - success",
              transaction: (t) => ({
                ...t,
                validators: [
                  {
                    address:
                      "cosmosvaloper1grgelyng2v6v3t8z87wu3sxgt9m5s03xfytvz7",
                    amount: BigNumber(100),
                  },
                ],
                mode: "claimRewardCompound",
              }),
              expectedStatus: {
                errors: {},
                warnings: {},
              },
            },
          ],
        },
      ],
    },
  },
};

export default dataset;

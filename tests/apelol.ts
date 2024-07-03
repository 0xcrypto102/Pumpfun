import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Apelol } from "../target_devnet/types/apelol";
import {
  TOKEN_PROGRAM_ID,
  createAccount,
  createInitializeMintInstruction,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
  createMint,
  createAssociatedTokenAccount,
  getAssociatedTokenAddress,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  mintTo,
  mintToChecked,
  getAccount,
  getMint,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMintToCheckedInstruction
} from "@solana/spl-token";

import * as bs58 from "bs58";
import {
  SystemProgram,
  Keypair,
  PublicKey,
  Transaction,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
  Connection,
  clusterApiUrl,
  sendAndConfirmTransaction
} from "@solana/web3.js";
import assert from "assert";
import { publicKey } from "@coral-xyz/anchor/dist/cjs/utils";

// import keypair from "../keypair.json";
import keypairProduction from "../keypair.production.json";

const config = {
  keypair: "2LU9Gir9pDVEsUWrRHLUUdPaVM642EmMGubgyZg2LNYk1uyD4LNRR5HshCENmfTUD3nPMeN7FCJKxEdu48YSEpta",
  ownerWaller: "Bmed1qoe6u8VxmJ5p6SW77fb7LiSqWmQdTtKTz5dyh62",
  feeWallet: "HUP3sFikZzfGTLYWNjUp1Zx9oQMv7R15SFmMqy2VSecb"
};
// const config = {
//   keypair: keypairProduction,
//   ownerWaller: "Dk6NAvymPjC4NrPK1yaiPvis9iKABhYf7g9LkAMvCG7x",
//   feeWallet: "EeGzciz6Axy4PHvQNrCvEvbajLo1EATwJFKzYtbWpMg1"
// };

describe("Apelol", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.apelol as Program<Apelol>;
  const feeRecipient = new PublicKey(config.feeWallet);

  const owner = Keypair.fromSecretKey(bs58.decode(config.keypair));

  const user = Keypair.fromSecretKey(
    bs58.decode(
      "2LU9Gir9pDVEsUWrRHLUUdPaVM642EmMGubgyZg2LNYk1uyD4LNRR5HshCENmfTUD3nPMeN7FCJKxEdu48YSEpta"
    )
  );

  const buyer = Keypair.fromSecretKey(
    bs58.decode(
      "TGW9dbYndwDA5VbBBsA3AQsGtTgoCetjpJwbuCjNF3pv2J1rCXraZNrNXHhu2fxKTaNCFiotT9z3QCnujQ3WGhD"
    )
  );

  let global: PublicKey;
  let globalBump: number;
  const mint = new PublicKey("5SUDTjKUQ6RBZ5nED3VcMCtUKAFhmJ4b5Ar4Yodpn7au");
  const BONDING_CURVE = "BONDING-CURVE";
  const SOL_VAULT_SEED = "SOL-VAULT-SEED";
  const VAULT_SEED = "VAULT-SEED";
  type Event = anchor.IdlEvents<(typeof program)["idl"]>;
  console.log(user.publicKey.toString());

  it("GET PDA", async () => {
    [global, globalBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("GLOBAL-STATE-SEED")],
      program.programId
    );
    console.log("global->", global.toString());
  });

  it("Is initialized!", async () => {
    try {
      const tx = await program.rpc.initialize({
        accounts: {
          global,
          owner: owner.publicKey,
          systemProgram: SystemProgram.programId
        },
        signers: [owner]
      });
      console.log("tx->", tx);
    } catch (error) {
      console.log(error);
    }
  });

  it("set params", async () => {
    const initialVirtualTokenReserves = "1073000000000000000";
    const initialVirtualSolReserves = "30000000000";
    const initialRealTokenReserves = "793100000000000000";
    const tokenTotalSupply = "1000000000000000000";
    const feeBasisPoints = 100;
    const mcap = "300000000000";
    const ownerWallet = new PublicKey(config.ownerWaller);
    const createFee = 6900000; // 1sol (1sol = 10 ** 9 lamports) 0.0069 $1

    try {
      const tx = await program.rpc.setParams(
        feeRecipient,
        ownerWallet,
        new anchor.BN(initialVirtualTokenReserves),
        new anchor.BN(initialVirtualSolReserves),
        new anchor.BN(initialRealTokenReserves),
        new anchor.BN(tokenTotalSupply),
        new anchor.BN(mcap),
        new anchor.BN(feeBasisPoints),
        new anchor.BN(createFee),
        {
          accounts: {
            global,
            user: owner.publicKey
          },
          signers: [owner]
        }
      );
      const globalData = await program.account.global.fetch(global);
      console.log("globalData->", globalData);
    } catch (error) {
      console.log(error);
    }
  });

  it("create", async () => {
    const [bondingCurve, _1] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(BONDING_CURVE), mint.toBuffer()],
      program.programId
    );

    const [vault, _2] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(SOL_VAULT_SEED), mint.toBuffer()],
      program.programId
    );

    const [associatedBondingCurve, _3] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(VAULT_SEED), mint.toBuffer()],
        program.programId
      );

    const associatedUserAccount = await getAssociatedTokenAddress(
      mint,
      user.publicKey
    );

    try {
      let depositAmount = "990000000000000000";
      let listenerId: number;
      // const event = await new Promise<Event[E]>(async (res) => {
      //   listenerId = program.addEventListener("CreateEvent", (event) => {
      //     res(event);
      //   });
      const create_tx = await program.rpc.create(new anchor.BN(depositAmount), {
        accounts: {
          user: user.publicKey,
          mint: mint,
          feeRecipient: feeRecipient,
          bondingCurve,
          associatedBondingCurve,
          associatedUserAccount,
          global,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID
        },
        signers: [user]
      });
      console.log("create_tx->", create_tx);
      // });
      // await program.removeEventListener(listenerId);
      // console.log(event);
    } catch (error) {
      console.log(error);
    }
  });

  it("buy", async () => {
    const [bondingCurve, _1] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(BONDING_CURVE), mint.toBuffer()],
      program.programId
    );

    const [vault, _2] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(SOL_VAULT_SEED), mint.toBuffer()],
      program.programId
    );
    console.log("vault->", vault.toString());

    const [associatedBondingCurve, _3] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(VAULT_SEED), mint.toBuffer()],
        program.programId
    );

    const liquidityPool = await program.account.bondingCurve.fetch(
      bondingCurve
    );
    const globalPool = await program.account.global.fetch(
      global
    );

    const associatedUserAccount = await getAssociatedTokenAddress(
      mint,
      owner.publicKey
    );


    const slippage = 20;
    const amount = 1;
    const tokenReceivedWithLiquidity = exchangeRate(
      Math.floor(1e9 * amount),
      globalPool,
      liquidityPool
    );
    console.log(Number(tokenReceivedWithLiquidity));
    const solAmount = new anchor.BN(Math.floor(1e9 * amount));
    const maxSolAmount = solAmount
      .mul(new anchor.BN(100 + slippage))
      .div(new anchor.BN(100));
    console.log(
      "tokenReceivedWithLiquidity->",Number(tokenReceivedWithLiquidity)
    );
    try {
      let listenerId: number;
      // const event = await new Promise<Event[E]>(async (res) => {
      //   listenerId = program.addEventListener("TradeEvent", (event) => {
      //     res(event);
      //   });
      const buy_tx = await program.rpc.buy(
        new anchor.BN(tokenReceivedWithLiquidity.toString()),
        new anchor.BN(maxSolAmount),
        {
          accounts: {
            global,
            feeRecipient,
            mint,
            vault,
            bondingCurve,
            associatedBondingCurve,
            associatedUser: associatedUserAccount,
            user: owner.publicKey,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            clock: SYSVAR_CLOCK_PUBKEY
          },
          signers: [owner]
        }
      );
      console.log(buy_tx);
      // });
      // await program.removeEventListener(listenerId);
      // console.log(event);
    } catch (error) {
      console.log(error);
    }
  });
  
  it("sell", async () => {
    const associatedUserAccount = await getAssociatedTokenAddress(
      mint,
      owner.publicKey
    );

    const [bondingCurve, _1] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(BONDING_CURVE), mint.toBuffer()],
      program.programId
    );

    const [vault, _2] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(SOL_VAULT_SEED), mint.toBuffer()],
      program.programId
    );

    const [associatedBondingCurve, _3] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(VAULT_SEED), mint.toBuffer()],
        program.programId
      );
 
    let tokenAmount = await program.provider.connection.getTokenAccountBalance(
      associatedUserAccount
    );

    const globalStateData: any = await program.account.global.fetch(global);
    const feeRecipient: PublicKey = globalStateData.feeRecipient;

    const liquidityPool = await program.account.bondingCurve.fetch(
      bondingCurve
    );
    const slippage = 20;
    const amount = "23050812086017538"

    const solAmount = exchangeSellRate(new anchor.BN(amount), liquidityPool);
    console.log("sol amount ->", solAmount);
    const minSolAmount = solAmount * (100 - slippage) / 100;
    console.log("sol amount ->", minSolAmount);

    try {
    //   let listenerId: number;
    //   // const event = await new Promise<Event[E]>(async (res) => {
    //   //   listenerId = program.addEventListener("TradeEvent", (event) => {
    //   //     res(event);
    //   //   });
      const sell_tx = await program.rpc.sell(
        new anchor.BN(amount),
        new anchor.BN(minSolAmount),
        {
          accounts: {
            global,
            feeRecipient,
            mint,
            vault,
            bondingCurve,
            associatedBondingCurve,
            associatedUser: associatedUserAccount,
            user: owner.publicKey,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            clock: SYSVAR_CLOCK_PUBKEY
          },
          signers: [owner]
        }
      );
      console.log(sell_tx);
    //   // });
    //   // await program.removeEventListener(listenerId);
    //   // console.log(event);
    } catch (error) {
      console.log(error);
    }
  });

  /*
  it("withdraw the bonding curve", async () => {
    const [bondingCurve, _1] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(BONDING_CURVE), mint.toBuffer()],
      program.programId
    );

    const [vault, _2] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(SOL_VAULT_SEED), mint.toBuffer()],
      program.programId
    );

    const [associatedBondingCurve, _3] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(VAULT_SEED), mint.toBuffer()],
        program.programId
      );

    const associatedUserAccount = await getAssociatedTokenAddress(
      mint,
      user.publicKey
    );
    console.log("associatedUserAccount->", associatedUserAccount.toString());

    try {
      const tx = await program.rpc.withdraw({
        accounts: {
          global,
          mint,
          vault,
          bondingCurve,
          associatedBondingCurve,
          associatedUser: associatedUserAccount,
          ownerWallet: user.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY
        },
        signers: [user]
      });
      console.log("tx->", tx);
    } catch (error) {
      console.log(error);
    }
  });
  */
});

const exchangeRate = (
  purchaseAmount: number,
  globalPool: any,
  liquidityPool: any
) => {
  let tokensSold = 0;
  let soldAmount = liquidityPool.tokenTotalSupply / 5;
  console.log(globalPool);

  // Ensure that globalPool.initialVirtualTokenReserves is defined and is a BN instance
  if (!globalPool.initialVirtualTokenReserves || !anchor.BN.isBN(globalPool.initialVirtualTokenReserves)) {
    throw new Error('globalPool.initialVirtualTokenReserves is not defined or not a BN instance');
  }

  let tempVirtualTokenReserves = globalPool.initialVirtualTokenReserves;
  console.log("tempVirtualTokenReserves->", Number(tempVirtualTokenReserves));
  console.log("soldAmount->", Number(soldAmount));


  // Ensure soldAmount is a BN instance
  // soldAmount = new anchor.BN(soldAmount);

  let tempPricePerToken = Number(tempVirtualTokenReserves) - soldAmount;
  console.log("tempPricePerToken->", tempPricePerToken);

  // Ensure that globalPool.initialVirtualSolReserves is defined and is a BN instance
  if (!globalPool.initialVirtualSolReserves || !anchor.BN.isBN(globalPool.initialVirtualSolReserves)) {
    throw new Error('globalPool.initialVirtualSolReserves is not defined or not a BN instance');
  }

  let tempTotalLiquidity = globalPool.initialVirtualTokenReserves.mul(
    globalPool.initialVirtualSolReserves
  );
  console.log("tempTotalLiquidity->", tempTotalLiquidity);

  // Ensure globalPool.virtualSolReserves is defined and is a BN instance
  if (!globalPool.initialVirtualSolReserves || !anchor.BN.isBN(globalPool.initialVirtualSolReserves)) {
    throw new Error('globalPool.virtualSolReserves is not defined or not a BN instance');
  }

  let tempNewSolReserve = Number(tempTotalLiquidity)/(tempPricePerToken);
  console.log("tempNewSolReserve->", tempNewSolReserve);

  let temp_sol_cost = tempNewSolReserve - Number(globalPool.initialVirtualSolReserves);
  console.log("temp_sol_cost->", temp_sol_cost);

  // Ensure liquidityPool.virtualTokenReserves is defined and is a BN instance
  if (!liquidityPool.virtualTokenReserves || !anchor.BN.isBN(liquidityPool.virtualTokenReserves)) {
    throw new Error('liquidityPool.virtualTokenReserves is not defined or not a BN instance');
  }

  const virtualTokenReserves = Number(liquidityPool.virtualTokenReserves) - soldAmount;
  console.log("virtualTokenReserves->", virtualTokenReserves);

  // Ensure liquidityPool.virtualSolReserves is defined and is a BN instance
  if (!liquidityPool.virtualSolReserves || !anchor.BN.isBN(liquidityPool.virtualSolReserves)) {
    throw new Error('liquidityPool.virtualSolReserves is not defined or not a BN instance');
  }

  const totalLiquidity = (Number(liquidityPool.virtualSolReserves) + temp_sol_cost)
 * virtualTokenReserves;
  console.log("totalLiquidity->", totalLiquidity);

  const newSolReserve = Number(liquidityPool.virtualSolReserves) + temp_sol_cost + purchaseAmount;
  console.log("newSolReserve->", newSolReserve);

  const pricePerToken = totalLiquidity / newSolReserve;
  console.log("pricePerToken->", pricePerToken);

  tokensSold = virtualTokenReserves - pricePerToken;
  console.log("tokensSold->", Number(tokensSold));

  // Ensure liquidityPool.realTokenReserves is defined and is a BN instance
  if (!liquidityPool.realTokenReserves || !anchor.BN.isBN(liquidityPool.realTokenReserves)) {
    throw new Error('liquidityPool.realTokenReserves is not defined or not a BN instance');
  }

  const realTokenReserves = Number(liquidityPool.realTokenReserves);
  console.log("realTokenReserves->", realTokenReserves);
  const amount = tokensSold
  console.log("amount->", amount);
  const featureAmount = realTokenReserves - amount;
  console.log("featureAmount->", featureAmount);
  const featurePercentage = featureAmount / Number(liquidityPool.tokenTotalSupply) * 100;
  console.log("featurePercentage->", featurePercentage);



  // tokensSold = anchor.BN.min(
  //   tokensSold,
  //   liquidityPool.realTokenReserves.sub(soldAmount)
  // );

  // if (tokensSold.lt(new anchor.BN(0))) {
  //   tokensSold = new anchor.BN(0);
  // }

  return tokensSold;
};


const exchangeSellRate = (amount: anchor.BN, liquidityPool: any) => {
  const token_amount = Number(amount);
  console.log("token_amount->", token_amount);
  const price_per_token  = Number(liquidityPool.virtualTokenReserves) + token_amount;
  console.log("price_per_token->", price_per_token);

  const total_liquidity = Number(liquidityPool.virtualSolReserves) * Number(liquidityPool.virtualTokenReserves);
  console.log("total_liquidity->", total_liquidity);

  const new_sol_reserve = total_liquidity / Number(price_per_token);
  console.log("new_sol_reserve->", new_sol_reserve);

  const sol_cost = Number(liquidityPool.virtualSolReserves) - new_sol_reserve;
  console.log("sol_cost->", sol_cost);

  return sol_cost;
};

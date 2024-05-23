import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Pumpfun } from "../target/types/pumpfun";
import { TOKEN_PROGRAM_ID, createAccount,createInitializeMintInstruction, MINT_SIZE,getMinimumBalanceForRentExemptMint,createMint, createAssociatedTokenAccount, getAssociatedTokenAddress , ASSOCIATED_TOKEN_PROGRAM_ID, mintTo, mintToChecked, getAccount, getMint, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction,createMintToCheckedInstruction } from "@solana/spl-token";
// import {
// 	findMasterEditionPda,
// 	findMetadataPda,
// 	mplTokenMetadata,
// 	MPL_TOKEN_METADATA_PROGRAM_ID,
// } from "@metaplex-foundation/mpl-token-metadata";
// import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
// import { publicKey } from "@metaplex-foundation/umi";
// import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";

import * as bs58 from "bs58";
import { SystemProgram, Keypair, PublicKey, Transaction, SYSVAR_RENT_PUBKEY, SYSVAR_CLOCK_PUBKEY, Connection, clusterApiUrl,sendAndConfirmTransaction } from "@solana/web3.js";
import assert from "assert";
import { publicKey } from "@coral-xyz/anchor/dist/cjs/utils";

describe("pumpfun", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Pumpfun as Program<Pumpfun>;
  const feeRecipient = new PublicKey("HVuCDBFkK3gKJh6N7XoPGuopzs6jY8JAktQLy8MHAstq");

  const owner = Keypair.fromSecretKey(
    bs58.decode("6eQQ17bXGDkLVPtyNSDL1tC8KPrkAaWRR6PHRLguYmwGXMtqgBMzHdYe1i7bFkay2idJSS83hsMXsHh9R9pFJVH")
  );

  const user = Keypair.fromSecretKey(
    bs58.decode("2LU9Gir9pDVEsUWrRHLUUdPaVM642EmMGubgyZg2LNYk1uyD4LNRR5HshCENmfTUD3nPMeN7FCJKxEdu48YSEpta")
  );

  let global: PublicKey;
  let globalBump: number;
  const mint = new PublicKey("5hyJ6h3ABjF7zEBhc32LWT5ZUCkNx4AZkdRzKC1MUHRb");
  const BONDING_CURVE = "BONDING-CURVE";
  const SOL_VAULT_SEED = "SOL-VAULT-SEED";
  const VAULT_SEED = "VAULT-SEED";

  it("GET PDA", async() => {
    [global,globalBump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("GLOBAL-STATE-SEED")
      ],
      program.programId
    );
    console.log("global->", global.toString());
  });
  it("Is initialized!", async () => {
    const tx = await program.rpc.initialize(
      {
        accounts: {
          global,
          owner: owner.publicKey,
          systemProgram: SystemProgram.programId
        },
        signers: [owner]
      }
    );
    console.log("tx->", tx);
  });

  it("set params", async() => {
    const initialVirtualTokenReserves = 1073000000000000;
    const initialVirtualSolReserves = 30000000000;
    const initialRealTokenReserves = 793100000000000;
    const tokenTotalSupply = 1000000000000000;
    const feeBasisPoints = 50;

    const tx = await program.rpc.setParams(
      feeRecipient,
      new anchor.BN(initialVirtualTokenReserves),
      new anchor.BN(initialVirtualSolReserves),
      new anchor.BN(initialRealTokenReserves),
      new anchor.BN(tokenTotalSupply),
      new anchor.BN(feeBasisPoints),{
        accounts: {
          global,
          user: owner.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [owner]
      }
    );
    const globalData = await program.account.global.fetch(global);
    console.log("globalData->", globalData);
  });
  /*

  it("create", async() => {
    const [bondingCurve, _1] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(BONDING_CURVE),
        mint.toBuffer()
      ],
      program.programId
    );

    const [vault, _2] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(SOL_VAULT_SEED),
        mint.toBuffer()
      ],
      program.programId
    );

    const [associatedBondingCurve, _3] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(VAULT_SEED),
        mint.toBuffer()
      ],
      program.programId
    );

    const associatedUserAccount = await getAssociatedTokenAddress(
      mint,
      user.publicKey
    );

    try {
      let depositAmount = 10000_000000;
      const create_tx = await program.rpc.create(
        new anchor.BN(depositAmount),
        {
          accounts: {
            user: user.publicKey,
            mint: mint,
            bondingCurve,
            vault,
            associatedBondingCurve,
            associatedUserAccount,
            global,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID
          },
          signers: [user]
        }
      );
      console.log("create_tx->",create_tx);
      console.log("vault->", vault.toString());
      console.log("associatedBondingCurve->", associatedBondingCurve.toString());
    } catch (error) {
      console.log(error);
    }
  });

  it("buy", async() => {
    const [bondingCurve, _1] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(BONDING_CURVE),
        mint.toBuffer()
      ],
      program.programId
    );
  
    const [vault, _2] = await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from(SOL_VAULT_SEED),
      mint.toBuffer()
    ],
    program.programId
    );
  
    const [associatedBondingCurve, _3] = await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from(VAULT_SEED),
      mint.toBuffer()
    ],
    program.programId
    );

    const associatedUserAccount = await getAssociatedTokenAddress(
      mint,
      user.publicKey
    );

    const globalStateData: any = await program.account.global.fetch(global);
    const feeRecipient: PublicKey = globalStateData.feeRecipient;

    const liquidityPool = await program.account.bondingCurve.fetch(bondingCurve);
    const slippage = 20;
    const amount = 0.0001
    const tokenReceivedWithLiquidity = exchangeRate(Math.floor(1e9 * amount), liquidityPool);
    const solAmount = new anchor.BN(Math.floor(1e9 * amount));
    const maxSolAmount =  solAmount.mul(new anchor.BN(100 + slippage)).div(new anchor.BN(100));
    console.log(Number(tokenReceivedWithLiquidity), Number(liquidityPool.realTokenReserves))
    try {
      const buy_tx = await program.rpc.buy(
        tokenReceivedWithLiquidity, 
        maxSolAmount, 
          {
            accounts: {
              global,
              feeRecipient,
              mint,
              bondingCurve,
              associatedBondingCurve,
              associatedUser: associatedUserAccount,
              user: user.publicKey,
              systemProgram: SystemProgram.programId,
              tokenProgram: TOKEN_PROGRAM_ID,
              rent: SYSVAR_RENT_PUBKEY
            },
            signers: [user]
          }
        );
    } catch (error) {
      console.log(error);
    }
   
  })
  */

});

const exchangeRate = (purchaseAmount: number, liquidityPool: any) => {
  let tokensSold = new anchor.BN(0);
  const totalLiquidity = liquidityPool.virtualSolReserves.mul(liquidityPool.virtualTokenReserves);
  const newSolReserve = liquidityPool.virtualSolReserves.add(new anchor.BN(purchaseAmount));
  const pricePerToken = totalLiquidity.div(newSolReserve).add(new anchor.BN(1));
  tokensSold = liquidityPool.virtualTokenReserves.sub(pricePerToken);
  tokensSold = anchor.BN.min(tokensSold, liquidityPool.realTokenReserves);

  return tokensSold;
};
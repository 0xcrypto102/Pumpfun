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

  let global: PublicKey;
  let globalBump: number;

  it("GET PDA", async() => {
    [global,globalBump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("global")
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
    )
  });
});

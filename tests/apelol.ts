import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Apelol } from "../target/types/apelol";
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
  createMintToCheckedInstruction,
  getOrCreateAssociatedTokenAccount
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


describe("Apelol", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.apelol as Program<Apelol>;
  const feeRecipient = new PublicKey(
    "HUP3sFikZzfGTLYWNjUp1Zx9oQMv7R15SFmMqy2VSecb"
  );

  const owner = Keypair.fromSecretKey(
    Uint8Array.from([113, 63, 93, 213, 68, 178, 22, 189, 136, 49, 33, 174, 196, 213, 238, 242, 164, 106, 9, 180, 15, 3, 238, 80, 159, 127, 118, 18, 231, 206, 240, 93, 21, 168, 99, 61, 85, 242, 222, 187, 12, 44, 91, 158, 122, 83, 103, 113, 125, 136, 28, 83, 108, 248, 78, 219, 197, 250, 38, 187, 70, 109, 130, 194])
  );

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
  let mint: PublicKey;
  let tokenAta: PublicKey;
  // const mint = new PublicKey("hVvp6MMynkk8JkvKYvn2wXZZkNU5qd9C2ov2S1X9MLk");
  const BONDING_CURVE = "BONDING-CURVE";
  const SOL_VAULT_SEED = "SOL-VAULT-SEED";
  const VAULT_SEED = "VAULT-SEED";
  const tokenDecimal = 9;
  type Event = anchor.IdlEvents<(typeof program)["idl"]>;
  // console.log(user.publicKey.toString());

  
  
  it("GET PDA", async () => {
    [global, globalBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("GLOBAL-STATE-SEED")],
      program.programId
    );
    console.log("Get Global PDA->", global.toString());
  });
  it("Is initialized!", async () => {
    try {
      // 1 - Request Airdrop
      const signature = await program.provider.connection.requestAirdrop(
        owner.publicKey,
        10 ** 9
      );
       // 2 - Fetch the latest blockhash
      const { blockhash, lastValidBlockHeight } = await program.provider.connection.getLatestBlockhash();
      // 3 - Confirm transaction success
      await program.provider.connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature
      }, 'confirmed');

      const tx = await program.rpc.initialize({
        accounts: {
          global,
          owner: owner.publicKey,
          systemProgram: SystemProgram.programId
        },
        signers: [owner]
      });
      console.log("Initialize Tx->", tx);
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
    const ownerWallet = new PublicKey(
      "Bmed1qoe6u8VxmJ5p6SW77fb7LiSqWmQdTtKTz5dyh62"
    );
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
      console.log("globalData->", {
        initialized: globalData.initialized,
        authority: globalData.authority.toBase58(),
        feeRecipient: globalData.feeRecipient.toBase58(),
        ownerWallet: globalData.ownerWallet.toBase58(),
        initialVirtualTokenReserves: parseInt(globalData.initialVirtualTokenReserves.toString()),
        initialVirtualSolReserves: parseInt(globalData.initialVirtualSolReserves.toString()),
        initialRealTokenReserves: parseInt(globalData.initialRealTokenReserves.toString()),
        tokenTotalSupply: parseInt(globalData.tokenTotalSupply.toString()),
        feeBasisPoints: parseInt(globalData.feeBasisPoints.toString()),
        mcapLimit: parseInt(globalData.mcapLimit.toString()),
        createFee: parseInt(globalData.createFee.toString()),
      });
    } catch (error) {
      console.log(error);
    }
  });

  it("Mint Token to user wallet", async () => {
    try {
      mint = await createMint(program.provider.connection, owner, owner.publicKey, null, tokenDecimal)
      console.log('Mint / mint address: ', mint.toBase58());
      tokenAta = (await getOrCreateAssociatedTokenAccount(program.provider.connection, owner, mint, owner.publicKey)).address
      // console.log('token1 account address: ', tokenAta.toBase58());
      try {
        //minting 100 new tokens to the token address we just created
        await mintTo(program.provider.connection, owner, mint, tokenAta, owner.publicKey, BigInt("1000000000000000000"))
      } catch (error) {
        console.log("🚀 ~ here:", error)
      }
      const tokenBalance = await program.provider.connection.getTokenAccountBalance(tokenAta)
      console.log("Mint / TokenBalance in user:", tokenBalance.value.uiAmount)
    } catch (error) {
      console.log("Token 1 creation error \n", error)
    }
     
  })

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
      owner.publicKey
    );
    const globalStateData: any = await program.account.global.fetch(global);
    const feeRecipient: PublicKey = globalStateData.feeRecipient;

    try {
      let depositAmount = "990000000000000000";
      // let listenerId: number;
      // const event = await new Promise<Event[E]>(async (res) => {
      //   listenerId = program.addEventListener("CreateEvent", (event) => {
      //     res(event);
      //   });
        const create_tx = await program.rpc.create(
          new anchor.BN(depositAmount),
          {
            accounts: {
              user: owner.publicKey,
              mint: mint,
              bondingCurve,
              feeRecipient,
              associatedBondingCurve,
              associatedUserAccount,
              global,
              systemProgram: SystemProgram.programId,
              tokenProgram: TOKEN_PROGRAM_ID
            },
            signers: [owner]
          }
        );
        console.log("Create tx->", create_tx);
      // });
      // await program.removeEventListener(listenerId);
      // console.log(event);
    } catch (error) {
      console.log(error);
    }
  });

  it("buy", async() => {

    // 1 - Request Airdrop
    const signature = await program.provider.connection.requestAirdrop(
      buyer.publicKey,
      2 * 10 ** 9
    );
     // 2 - Fetch the latest blockhash
    const { blockhash, lastValidBlockHeight } = await program.provider.connection.getLatestBlockhash();
    // 3 - Confirm transaction success
    await program.provider.connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature
    }, 'confirmed');

    
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
    // console.log("Vault->", vault.toString());
  
    const [associatedBondingCurve, _3] = await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from(VAULT_SEED),
      mint.toBuffer()
    ],
    program.programId
    );

    const associatedUserAccount = await getOrCreateAssociatedTokenAccount(
      program.provider.connection,
      buyer,
      mint,
      buyer.publicKey,
    );
    const tokenBalance = parseInt((await program.provider.connection.getTokenAccountBalance(associatedUserAccount.address)).value.amount)
    // console.log("TokenBalance Before: ", tokenBalance)
    const globalStateData: any = await program.account.global.fetch(global);
    const feeRecipient: PublicKey = globalStateData.feeRecipient;

    const liquidityPool = await program.account.bondingCurve.fetch(bondingCurve);
    const slippage = 20;
    const amount = 1;
    const tokenReceivedWithLiquidity = exchangeRate(Math.floor(1e9 * amount), liquidityPool);
    // console.log(Number(tokenReceivedWithLiquidity))
    const solAmount = new anchor.BN(Math.floor(1e9 * amount));
    const maxSolAmount =  solAmount.mul(new anchor.BN(100 + slippage)).div(new anchor.BN(100));
    // console.log(Number(tokenReceivedWithLiquidity), Number(liquidityPool.realTokenReserves))
    try {
      let listenerId: number;
      const event = await new Promise<Event[E]>(async (res) => {
        listenerId = program.addEventListener("TradeEvent", (event) => {
          res(event);
        });
        const before = await program.provider.connection.getBalance(feeRecipient);
        const buy_tx = await program.rpc.buy(
          tokenReceivedWithLiquidity, 
          maxSolAmount, 
          {
            accounts: {
              global,
              feeRecipient,
                mint,
                vault,
                bondingCurve,
                associatedBondingCurve,
                associatedUser: associatedUserAccount.address,
                user: buyer.publicKey,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                clock: SYSVAR_CLOCK_PUBKEY
              },
              signers: [buyer]
            }
          );
          console.log("------------------Fee Wallet SOL Balance Change Show--------------------------")
          
          const after = await program.provider.connection.getBalance(feeRecipient);
          console.log("Before Buy: ", before, "     After Buy: ", after, "\n >>>====== Change Balance ", after - before, "\n >>>====== Buy SOL Balance", 10**9, "\n>>>>>>========= Percentage: ", (after - before)*100/10**9);
          console.log("------------------------------------------------------------------------------\n")
          
          const afterTokenBalance = parseInt((await program.provider.connection.getTokenAccountBalance(associatedUserAccount.address)).value.amount);
          
          console.log("--------------------------Token Balance Change Show---------------------------")
          
          console.log("Before Token Balance: ",tokenBalance, "After Buy Token Balance: ",afterTokenBalance, "\n Change Balance: " , afterTokenBalance - tokenBalance, "\n Bought Amount:  ", parseInt(event.tokenAmount.toString()))
          console.log("------------------------------------------------------------------------------\n")
          console.log("Buy Tx->", buy_tx,"\n");
        });
        await program.removeEventListener(listenerId);

        console.log("<==== Buy Token Amount", parseInt(event.tokenAmount.toString()));
    } catch (error) {
      console.log(error);
    }
   
  });
  
  it("sell", async() => {
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
      buyer.publicKey
    );
    // console.log("associatedUserAccount->", associatedUserAccount.toString());

    let tokenAmount = await program.provider.connection.getTokenAccountBalance(associatedUserAccount);
    
    const globalStateData: any = await program.account.global.fetch(global);
    const feeRecipient: PublicKey = globalStateData.feeRecipient;
    
    const liquidityPool = await program.account.bondingCurve.fetch(bondingCurve);
    const slippage = 20;
    const amount = tokenAmount.value.amount;
    
    const solAmount = exchangeSellRate(amount, liquidityPool);
    const minSolAmount =  solAmount.mul(new anchor.BN(100 - slippage)).div(new anchor.BN(100));
    // console.log("Before User Balance : ", (await program.provider.connection.getBalance(buyer.publicKey)));
    
    try {
      let listenerId: number;
      const event = await new Promise<Event[E]>(async (res) => {
        listenerId = program.addEventListener("TradeEvent", (event) => {
          res(event);
        });
        const before = await program.provider.connection.getBalance(feeRecipient);
        
        const sell_tx = await program.rpc.sell(
          new anchor.BN(amount), 
          minSolAmount, 
          {
            accounts: {
              global,
              feeRecipient,
              mint,
              vault,
              bondingCurve,
              associatedBondingCurve,
              associatedUser: associatedUserAccount,
              user: buyer.publicKey,
              systemProgram: SystemProgram.programId,
              tokenProgram: TOKEN_PROGRAM_ID,
              clock: SYSVAR_CLOCK_PUBKEY
            },
            signers: [buyer]
          }
        );
        console.log("<==== Sell Token Amount", parseInt(amount), "\n");
        console.log("------------------Fee Wallet SOL Balance Change Show--------------------------")
        const after = await program.provider.connection.getBalance(feeRecipient);
        console.log("Before Sell: ", before, "     After Sell: ", after, "\n >>>====== Change Balance  ", after - before, "\n >>>====== Sell SOL Balance",parseInt(event.solAmount.toString()), "\n>>>>>>========= Percentage: ", (after - before)*100/parseInt(event.solAmount.toString()));
        console.log("------------------------------------------------------------------------------\n")
        
        console.log("Sell Tx->", sell_tx);
        // console.log("After User Balance : ", (await program.provider.connection.getBalance(buyer.publicKey)));
      });
      await program.removeEventListener(listenerId);
    } catch (error) {
      console.log(error);
    }
  });

  /*
 it("withdraw the bonding curve", async() => {
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
  console.log("associatedUserAccount->", associatedUserAccount.toString());

  try {
    const tx = await program.rpc.withdraw(
      {
        accounts: {
          global,
          mint,
          vault,
          bondingCurve,
          associatedBondingCurve,
          associatedUser:associatedUserAccount,
          ownerWallet: user.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram:TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY
        },
        signers: [user]
      }
    );
    console.log("tx->", tx);
  } catch (error) {
    console.log(error);
  }


 });
 */
});

const exchangeRate = (purchaseAmount: number, liquidityPool: any) => {
  let tokensSold = new anchor.BN(0);
  const totalLiquidity = liquidityPool.virtualSolReserves.mul(
    liquidityPool.virtualTokenReserves
  );
  const newSolReserve = liquidityPool.virtualSolReserves.add(
    new anchor.BN(purchaseAmount)
  );
  const pricePerToken = totalLiquidity.div(newSolReserve);
  tokensSold = liquidityPool.virtualTokenReserves.sub(pricePerToken);
  // console.log(Number(tokensSold));
  tokensSold = anchor.BN.min(tokensSold, liquidityPool.realTokenReserves);
  if (tokensSold < new anchor.BN(0)){
    tokensSold =  new anchor.BN(0);
  }
  return tokensSold;
};

const exchangeSellRate = (amount: string, liquidityPool: any) => {
  return new anchor.BN(amount).mul(liquidityPool.virtualSolReserves).div(new anchor.BN(liquidityPool.virtualTokenReserves));
};

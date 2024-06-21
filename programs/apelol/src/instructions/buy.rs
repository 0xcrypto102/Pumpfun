use anchor_lang::prelude::*;

use anchor_spl::token::{Mint,Token,TokenAccount,Transfer, transfer};

use crate::{
    constants::{GLOBAL_STATE_SEED, BONDING_CURVE, INITIAL_TOKEN_PRICE, PRICE_INCREASE_RATE, SOL_VAULT_SEED, UNITS_PER_TOKEN}, 
    state::{Global, BondingCurve},
    error::*,
    events::*,
};
use solana_program::{program::invoke, system_instruction};

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(
        seeds = [GLOBAL_STATE_SEED],
        bump
    )]
    pub global: Box<Account<'info, Global>>,
    /// CHECK:` doc comment explaining why no checks through types are necessary.
    #[account(mut)]
    pub fee_recipient: AccountInfo<'info>, // wallet address to receive the fee as SOL 

    #[account(mut)]
    pub mint: Box<Account<'info, Mint>>,  // the mint address of token

    #[account(
        mut,
        seeds = [SOL_VAULT_SEED, mint.key().as_ref()],
        bump
    )]
    /// CHECK: this should be set by admin
    pub vault: UncheckedAccount <'info>,

    #[account(
        mut,
        seeds = [BONDING_CURVE, mint.key().as_ref()],
        bump
    )]
    pub bonding_curve: Box<Account<'info, BondingCurve>>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = bonding_curve,
    )]
    pub associated_bonding_curve: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = user
    )]
    pub associated_user: Box<Account<'info, TokenAccount>>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub clock:  Sysvar<'info, Clock>,
}

pub fn buy(ctx: Context<Buy>, sol_cost: u64, min_token_output: u64) -> Result<()> {
    let accts = ctx.accounts;

    require!(sol_cost > 0, ApeLolCode::ZeroAmount);
    require!(accts.bonding_curve.complete == false, ApeLolCode::BondingCurveComplete);
    require!(accts.fee_recipient.key() == accts.global.fee_recipient, ApeLolCode::UnValidFeeRecipient);

    let bonding_curve = &accts.bonding_curve;

    // Calculate the required SOL cost for the given token amount
    let token_amount = calculate_token_amount_to_get(bonding_curve, (sol_cost as f64) / UNITS_PER_TOKEN)?;

    // Ensure the token output exceeds mint_token_output
    require!(token_amount >= min_token_output, ApeLolCode::TooLittleTokenReceived);

    // send sol except fee to the bonding curve
    let fee_amount = accts.global.fee_basis_points * sol_cost / 10000;

    invoke(
        &system_instruction::transfer(
            &accts.user.key(),
            &accts.vault.key(),
            sol_cost
        ),
        &[
            accts.user.to_account_info().clone(),
            accts.vault.to_account_info().clone(),
            accts.system_program.to_account_info().clone(),
        ],
    )?;
    // send fee to the fee recipent account
    invoke(
        &system_instruction::transfer(
            &accts.user.key(),
            &accts.fee_recipient.key(),
            fee_amount
        ),
        &[
            accts.user.to_account_info().clone(),
            accts.fee_recipient.to_account_info().clone(),
            accts.system_program.to_account_info().clone(),
        ],
    )?;
   
    // send token from vault account to user
    let binding = accts.mint.key();

    let (_, bump) = Pubkey::find_program_address(&[BONDING_CURVE, binding.as_ref()], ctx.program_id);
    let vault_seeds = &[BONDING_CURVE, binding.as_ref(), &[bump]];
    let signer = &[&vault_seeds[..]];

    let cpi_ctx = CpiContext::new(
        accts.token_program.to_account_info(),
        Transfer {
            from: accts.associated_bonding_curve.to_account_info().clone(),
            to: accts.associated_user.to_account_info().clone(),
            authority: accts.bonding_curve.to_account_info().clone(),
        },
    );
    transfer(
        cpi_ctx.with_signer(signer),
        token_amount,
    )?;

    //  update the bonding curve
    accts.bonding_curve.real_token_reserves -= token_amount;
    accts.bonding_curve.virtual_token_reserves -= token_amount;
    accts.bonding_curve.virtual_sol_reserves += sol_cost;
    accts.bonding_curve.real_sol_reserves += sol_cost;

    let macp = ((accts.bonding_curve.virtual_sol_reserves as u128) * (accts.bonding_curve.token_total_supply as u128) / (accts.bonding_curve.real_token_reserves as u128)) as u64;
    msg!("macp:{}",macp);
    let percentage = ((accts.bonding_curve.real_token_reserves as u128) * (100 as u128) / (accts.bonding_curve.token_total_supply as u128)) as u64;
    msg!("percentage:{}",percentage);

    if macp > accts.bonding_curve.mcap_limit || percentage < 20 {

        accts.bonding_curve.complete = true;

        msg!(
            "Bonding Curve Complete : User: {}, Mint: {}, BondingCurve: {}, Timestamp: {}",
            accts.user.key(),
            accts.mint.key(),
            accts.bonding_curve.key(),
            accts.clock.unix_timestamp
        );

        emit!(
            CompleteEvent { 
                user: accts.user.key(), 
                mint: accts.mint.key(), 
                bonding_curve: accts.bonding_curve.key(),
                timestamp: accts.clock.unix_timestamp, 
            }
        );
    } 

    msg!(
        "Trade // Type: Buy, User: {}, Mint: {}, BondingCurve: {}, Timestamp: {}, SolCost: {}, Amount: {}, IsBuy: {}, VirtualSolReserves: {}, VirtualTokenReserves: {}",
        accts.user.key(),
        accts.mint.key(),
        accts.bonding_curve.key(),
        accts.clock.unix_timestamp,
        sol_cost,
        token_amount,
        true,
        accts.bonding_curve.virtual_sol_reserves,
        accts.bonding_curve.virtual_token_reserves
    );

    emit!(
        TradeEvent { 
            mint: accts.mint.key(), 
            sol_amount: sol_cost, 
            token_amount: token_amount, 
            is_buy: true, 
            user: accts.user.key(), 
            timestamp: accts.clock.unix_timestamp, 
            virtual_sol_reserves: accts.bonding_curve.virtual_sol_reserves, 
            virtual_token_reserves: accts.bonding_curve.virtual_token_reserves, 
        }
    );

    Ok(())
}

// Get token amount according to sol amount when buying
fn calculate_token_amount_to_get(bonding_curve: &Account<BondingCurve>, sol_amount: f64) -> Result<u64> {
    let current_tokens_issued = (((bonding_curve.token_total_supply as u128) * 9900 / 10000) as f64 - bonding_curve.real_token_reserves as f64) / UNITS_PER_TOKEN;
    let a: f64 = INITIAL_TOKEN_PRICE;
    let b: f64 = PRICE_INCREASE_RATE;
    let token_amount = (sol_amount * b / a / (b * current_tokens_issued).exp() + 1.0).ln() / b;

    Ok((token_amount * UNITS_PER_TOKEN) as u64)
}
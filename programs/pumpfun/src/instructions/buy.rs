use anchor_lang::prelude::*;

use anchor_spl::token::{Mint,Token,TokenAccount,Transfer, transfer};

use crate::{
    constants::{GLOBAL_STATE_SEED, BONDING_CURVE, SOL_VAULT_SEED}, 
    state::{Global, BondingCurve},
    error::*,
};
use solana_program::{program::invoke, system_instruction};

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(
        seeds = [GLOBAL_STATE_SEED],
        bump
    )]
    pub global: Account<'info, Global>,
    /// CHECK:` doc comment explaining why no checks through types are necessary.
    #[account(mut)]
    pub fee_recipient: AccountInfo<'info>, // wallet address to receive the fee as SOL 

    #[account(mut)]
    pub mint: Account<'info, Mint>,  // the mint address of token

    #[account(
        mut,
        seeds = [SOL_VAULT_SEED, mint.key().as_ref()],
        bump
    )]
    /// CHECK: this should be set by admin
    pub vault: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [BONDING_CURVE, mint.key().as_ref()],
        bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = bonding_curve,
    )]
    pub associated_bonding_curve: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = user
    )]
    pub associated_user: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn buy(ctx: Context<Buy>, amount: u64, max_sol_cost: u64) -> Result<()> {
    let accts = ctx.accounts;

    require!(accts.bonding_curve.complete == false, PumpFunCode::BondingCurveComplete);

    let bonding_curve = &accts.bonding_curve;

    // Calculate the required SOL cost for the given token amount
    let sol_cost = calculate_sol_cost(bonding_curve, amount)?;

    // Ensure the SOL cost does not exceed max_sol_cost
    require!(sol_cost <= max_sol_cost, PumpFunCode::TooMuchSolRequired);

    // send sol except fee to the bonding curve
    let fee_amount = accts.global.fee_basis_points * sol_cost / 10000;
    let sol_amount = sol_cost - fee_amount;

    invoke(
        &system_instruction::transfer(
            &accts.user.key(),
            &accts.vault.key(),
            sol_amount
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
        amount,
    )?;

    //  update the bonding curve
    accts.bonding_curve.real_token_reserves -= amount;
    accts.bonding_curve.virtual_token_reserves -= amount;
    accts.bonding_curve.virtual_sol_reserves += sol_cost - fee_amount;
    accts.bonding_curve.real_sol_reserves += sol_cost - fee_amount;

    if accts.bonding_curve.real_sol_reserves > accts.global.initial_virtual_sol_reserves {
        accts.bonding_curve.complete = true;
    }

    Ok(())
}

fn calculate_sol_cost(bonding_curve: &Account<BondingCurve>, token_amount: u64) -> Result<u64> {
    let price_per_token  = (bonding_curve.virtual_token_reserves as u128).checked_sub(token_amount as u128).ok_or(PumpFunCode::MathOverflow)?;

    let total_liquidity = (bonding_curve.virtual_sol_reserves as u128).checked_mul(bonding_curve.virtual_token_reserves as u128).ok_or(PumpFunCode::MathOverflow)?;

    let new_sol_reserve = total_liquidity.checked_div(price_per_token-1).ok_or(PumpFunCode::MathOverflow)?;

    let sol_cost = new_sol_reserve.checked_sub(bonding_curve.virtual_sol_reserves as u128).ok_or(PumpFunCode::MathOverflow)?;

    Ok(sol_cost as u64)
}
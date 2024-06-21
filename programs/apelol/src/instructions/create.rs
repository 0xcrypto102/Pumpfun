use anchor_lang::prelude::*;
use anchor_spl::token::{Mint,Token,TokenAccount, Transfer, transfer, SetAuthority};
use std::mem::size_of;
use crate::{
    constants::{GLOBAL_STATE_SEED, BONDING_CURVE, VAULT_SEED},
    state::{Global, BondingCurve},
    error::*,
    events::*,
};
use solana_program::{program::invoke, system_instruction};
use anchor_spl::token;
use anchor_spl::token::spl_token::instruction::AuthorityType;

#[derive(Accounts)]
pub struct Create<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    pub mint: Box<Account<'info, Mint>>,

    /// CHECK:` doc comment explaining why no checks through types are necessary.
    #[account(mut)]
    pub fee_recipient: AccountInfo<'info>, // wallet address to receive the fee as SOL 

    #[account(
        init,
        payer = user,
        seeds = [BONDING_CURVE, mint.key().as_ref()],
        bump,
        space = 8 + size_of::<BondingCurve>()
    )]
    pub bonding_curve: Box<Account<'info, BondingCurve>>,

    #[account(
        init_if_needed,
        payer = user,
        seeds = [VAULT_SEED, mint.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = bonding_curve,
    )]
    pub associated_bonding_curve: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub associated_user_account: Box<Account<'info, TokenAccount>>,

    #[account(
        seeds = [GLOBAL_STATE_SEED],
        bump
    )]
    pub global: Box<Account<'info, Global>>,
   
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn create(ctx: Context<Create>, amount: u64) -> Result<()> {
    let global: &Box<Account<Global>> = &ctx.accounts.global;
    let bonding_curve: &mut Box<Account<BondingCurve>> = &mut ctx.accounts.bonding_curve;
    let mint = &ctx.accounts.mint;

    require!(global.initialized == true, ApeLolCode::NotInitialized);
    require!(ctx.accounts.fee_recipient.key() == ctx.accounts.global.fee_recipient, ApeLolCode::UnValidFeeRecipient);
    require!(mint.supply / 100 * 99 == amount, ApeLolCode::InvalidAmount);

    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.associated_user_account.to_account_info().clone(),
            to: ctx.accounts.associated_bonding_curve.to_account_info().clone(),
            authority: ctx.accounts.user.to_account_info().clone(),
        },
    );
    transfer(cpi_ctx, amount)?;
    
    invoke(
        &system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.fee_recipient.key(),
            global.create_fee
        ),
        &[
            ctx.accounts.user.to_account_info().clone(),
            ctx.accounts.fee_recipient.to_account_info().clone(),
            ctx.accounts.system_program.to_account_info().clone(),
        ],
    )?;
    // init the bonding curve
    bonding_curve.virtual_token_reserves = global.initial_virtual_token_reserves;
    bonding_curve.virtual_sol_reserves = global.initial_virtual_sol_reserves;
    bonding_curve.real_token_reserves = amount;
    bonding_curve.real_sol_reserves = 0;
    bonding_curve.token_total_supply = mint.supply;
    bonding_curve.mcap_limit = global.mcap_limit;
    bonding_curve.complete = false;
    bonding_curve.token_mint = ctx.accounts.mint.key();

    let cpi_accounts = SetAuthority {
        account_or_mint: ctx.accounts.mint.to_account_info().clone(),
        current_authority: ctx.accounts.user.to_account_info().clone(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::set_authority(cpi_ctx, AuthorityType::MintTokens, None)?;
 
    // Log the event details
    msg!(
        "CreateEvent - Mint: {}, BondingCurve: {}, User: {}",
        ctx.accounts.mint.key(),
        bonding_curve.key(),
        ctx.accounts.user.key()
    );
    
    emit!{
        CreateEvent {
            mint: ctx.accounts.mint.key(),
            bonding_curve: bonding_curve.key(),
            user: ctx.accounts.user.key()
        }
    }

    Ok(())
}
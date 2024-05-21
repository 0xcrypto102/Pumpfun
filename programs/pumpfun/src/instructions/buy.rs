use anchor_lang::prelude::*;

use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint,Token,TokenAccount,Transfer, transfer},
};

use crate::state::Global;

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(
        seeds = [b"global"],
        bump
    )]
    pub global: Account<'info, Global>,
    /// CHECK:` doc comment explaining why no checks through types are necessary.
    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub fee_recipient: AccountInfo<'info>,
    pub mint: Account<'info, Mint>,
    /// CHECK:` doc comment explaining why no checks through types are necessary.
    #[account(mut)]
    pub bonding_curve: AccountInfo<'info>,
    /// CHECK:` doc comment explaining why no checks through types are necessary.
    #[account(mut)]
    pub associated_bonding_curve: AccountInfo<'info>,
    /// CHECK:` doc comment explaining why no checks through types are necessary.
    #[account(mut)]
    pub associated_user: AccountInfo<'info>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    /// CHECK:` doc comment explaining why no checks through types are necessary.
    #[account(
        seeds = [b"__event_authority"],
        bump
    )]
    pub event_authority: AccountInfo<'info>,
    /// CHECK:` doc comment explaining why no checks through types are necessary.
    pub program: AccountInfo<'info>,
}

pub fn buy(ctx: Context<Buy>, amount: u64, max_sol_cost: u64) -> Result<()> {
    // Implement buy logic
    Ok(())
}
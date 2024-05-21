use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint,Token,TokenAccount,Transfer, transfer},
};

use crate::state::Global;

#[derive(Accounts)]
pub struct Create<'info> {
    #[account(mut)]
    pub mint: Signer<'info>,
    /// CHECK:` doc comment explaining why no checks through types are necessary.
    pub mint_authority: AccountInfo<'info>,
    /// CHECK:` doc comment explaining why no checks through types are necessary.
    #[account(mut)]
    pub bonding_curve: AccountInfo<'info>,
    /// CHECK:` doc comment explaining why no checks through types are necessary.
    #[account(mut)]
    pub associated_bonding_curve: AccountInfo<'info>,
    #[account(
        seeds = [b"global"],
        bump
    )]
    pub global: Account<'info, Global>,
    /// CHECK:` doc comment explaining why no checks through types are necessary.
    pub mpl_token_metadata: AccountInfo<'info>,
    /// CHECK:` doc comment explaining why no checks through types are necessary.
    #[account(mut)]
    pub metadata:  AccountInfo<'info>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
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

pub fn create(ctx: Context<Create>, name: String, symbol: String, uri: String) -> Result<()> {
    // Implement create logic
    Ok(())
}
use anchor_lang::prelude::*;
use crate::{state::Global};

#[derive(Accounts)]
pub struct SetParams<'info> {
    #[account(
        mut,
        seeds = [b"global"],
        bump
    )]
    pub global: Account<'info, Global>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    /// CHECK:` doc comment explaining why no checks through types are necessary.
    #[account(
        seeds = [b"__event_authority"],
        bump,
    )]
    pub event_authority: AccountInfo<'info>,
    /// CHECK:` doc comment explaining why no checks through types are necessary.
    pub program: AccountInfo<'info>,
}

pub fn set_params(ctx: Context<SetParams>, fee_recipient: Pubkey, initial_virtual_token_reserves: u64, initial_virtual_sol_reserves: u64, initial_real_token_reserves: u64, token_total_supply: u64, fee_basis_points: u64) -> Result<()> {
    let global = &mut ctx.accounts.global;

    global.fee_recipient = fee_recipient;
    global.initial_virtual_token_reserves = initial_virtual_token_reserves;
    global.initial_virtual_sol_reserves = initial_virtual_sol_reserves;
    global.initial_real_token_reserves = initial_real_token_reserves;
    global.token_total_supply = token_total_supply;
    global.fee_basis_points = fee_basis_points;
    
    Ok(())
}


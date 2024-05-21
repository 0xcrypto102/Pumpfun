use anchor_lang::prelude::*;

use crate::{state::Global};
use std::mem::size_of;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init, 
        payer = owner, 
        seeds = [b"global"],
        bump,
        space = 8 + size_of::<Global>()
    )]
    pub global: Account<'info, Global>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    let global = &mut ctx.accounts.global;
    global.initialized = true;
    
    Ok(())
}

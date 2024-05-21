pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
use instructions::*;
pub use state::*;

declare_id!("AZ4NiGp84gJ4HN19ey9yJEvTR42gcUoZBgTpKhwSf7Sa");

#[program]
pub mod pumpfun {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize(ctx)
    }

    pub fn set_params(
        ctx: Context<SetParams>, 
        fee_recipient: Pubkey, 
        initial_virtual_token_reserves: u64, 
        initial_virtual_sol_reserves: u64,
        initial_real_token_reserves: u64, 
        token_total_supply: u64, 
        fee_basis_points: u64
    ) -> Result<()> {
        instructions::set_params(
            ctx,
            fee_recipient, 
            initial_virtual_token_reserves, 
            initial_virtual_sol_reserves,
            initial_real_token_reserves, 
            token_total_supply, 
            fee_basis_points
        )
    }

    pub fn create(ctx: Context<Create>, name: String, symbol: String, uri: String) -> Result<()> {
        instructions::create(
            ctx,
            name, 
            symbol, 
            uri,
        )
    }

    pub fn buy(ctx: Context<Buy>, amount: u64, max_sol_cost: u64) -> Result<()> {
        instructions::buy(ctx, amount, max_sol_cost)
    }

    pub fn sell(ctx: Context<Sell>, amount: u64, min_sol_output: u64) -> Result<()> {        
        instructions::sell(ctx, amount, min_sol_output)
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        instructions::withdraw(ctx)
    }
}

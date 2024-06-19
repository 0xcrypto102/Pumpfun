use anchor_lang::prelude::*;

#[constant]
pub const GLOBAL_STATE_SEED: &[u8] = b"GLOBAL-STATE-SEED";
pub const MINT_SEED: &[u8] = b"mint";
pub const BONDING_CURVE: &[u8] = b"BONDING-CURVE";
pub const VAULT_SEED: &[u8] = b"VAULT-SEED";
pub const SOL_VAULT_SEED: &[u8] = b"SOL-VAULT-SEED";
pub const INITIAL_TOKEN_PRICE: f64 = 0.000001;
pub const PRICE_INCREASE_RATE: f64 = 0.00000001;
pub const UNITS_PER_TOKEN: f64 = 1_000_000_000.0;





# Ape.lol Contract

- Check version `solana-install update`

- `solana config set --keypair <path_to_your_keypair>`
- Build: `anchor build`
- Deploy: `solana program deploy target/deploy/pumpfun.so --with-compute-unit-price 20000 --keypair ./keypair.json`
- Close: `solana program close <Contract_Address> --keypair <Keypair_Path> --bypass-warning`
- Clean: `anchor clean`

# Init Contract

- `anchor run test`
- make sure you change config
- add the idl meta address
- `anchor run test -- --priority-fee 9000 --provider.cluster "https://mainnet.helius-rpc.com/?api-key=e2ddfac5-ccdd-4996-974d-af84e401132c"`

# Build

- anchor build
- Find address `solana address -k target/deploy/pumpfun-keypair.json`
- Change contract
- anchor build
- deploy

# Balance

solana balance --keypair ./keypair.json

# Reclaim SOL

solana program show --buffers --keypair ./keypair.json

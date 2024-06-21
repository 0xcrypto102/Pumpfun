# Ape.lol Contract

# Contracts

- Staging - `sAgQhdtEhUBvefvb6KYjP64aGWiaRVrgAWidZ7SFrSb`
- Devnet - `6DeKw29N78pNy1P45tGir6nXS9pbBnZMCxyM6ndUXDSoz`
- Mainnet - `C5aDJcpAswU8hzBNEwkj8kcxtcWJdBrQpxyFk1gMPg8z`

- Check version `solana-install update`

- `solana config set --keypair <path_to_your_keypair>`
- Build: `anchor build`
- Deploy: `solana program deploy target/deploy/apelol.so --with-compute-unit-price 20000 --keypair ./keypair.json`
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
solana program close --buffers --keypair ./keypair.json

# TODO Claim

- 5QXnJabQhP9M4Pi8QAh6MZrGenT9SFpwDaiVFvfYvVv3
- 8TmSyC9qHq1uuS8GGLbUpr9BgeMtT6jzQ9p9eEu5YVcV
- FcFFNPiN4wp4C5Z4VFKHQj8zp6nYmdRS5RWYPmGUPq6t
- 13uXqiDQ7Me2x79RwS8XgDDySwyjf7ZgUSp8gScYK4zp
- F8W5RvmqHZdKZiVVsK9jnAqh28dtR3dFViB3WrQniQBU

# Contracts

- Staging - `sAgQhdtEhUBvefvb6KYjP64aGWiaRVrgAWidZ7SFrSb`
- Devnet - `6DeKw29N78pNy1P45tGir6nXS9pbBnZMCxyM6ndUXDSoz`
- Mainnet - `C5aDJcpAswU8hzBNEwkj8kcxtcWJdBrQpxyFk1gMPg8z`

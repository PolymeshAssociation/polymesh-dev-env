#!/bin/bash
set -eu -o pipefail
export DEBIAN_FRONTEND=noninteractive
export BASHOPTS # copy options to subshells

export VAULT_ADDR=http://vault:8200

###############################################################

: "${TIMEOUT_SECONDS:=120}" # env var with default fallback

###############################################################

# Function to set status in psql db
set_status() {
  psql -c "INSERT INTO status (service_name, service_available) VALUES ('vault', $1) ON CONFLICT (service_name) DO UPDATE SET service_available = EXCLUDED.service_available" > /dev/null
}

wait_for_postgres() {
    local last_error=""
    SECONDS_DELTA=$SECONDS
    while [[ $(($SECONDS - $SECONDS_DELTA)) -lt "$TIMEOUT_SECONDS" ]]; do
        if last_error=$(psql -c "SELECT 1" 2>&1 > /dev/null); then
            echo "Postgres is ready"
            return 0
        fi
        sleep 1
    done

    >&2 echo "Timed out waiting for Postgres to become ready"
    >&2 echo "Last psql error: $last_error"
    return 1
}

wait_for_postgres
set_status "false"

initialize_vault() {
    echo "Initializing Vault"
    INIT=$(vault operator init \
                  -key-shares 1 \
                  -key-threshold 1 \
                  -format=json)
    echo "Saving Vault unseal and root keys to files"
    echo "$(echo "$INIT" | jq -r .unseal_keys_b64[0])" > /vault-token/.unseal_key
    echo "$(echo "$INIT" | jq -r .root_token)" > /vault-token/.token
}

unseal_vault() {
    local key
    if [ ! -f /vault-token/.unseal_key ]; then
        >&2 echo "Vault reports initialized but /vault-token/.unseal_key is missing."
        >&2 echo "The vault-volume and vault-root-token volumes are out of sync, remove both and restart."
        return 1
    fi
    key=$(cat /vault-token/.unseal_key)
    vault operator unseal $key

    check_transit_engine
}

check_transit_engine() {
    export VAULT_TOKEN=$(cat /vault-token/.token)

    if echo $(vault secrets list -format=json) | jq -e 'paths | join("/") | test("transit/") | not' > /dev/null; then
        vault secrets enable -path=transit transit
        # This will add an admin user who can be granted CDD authority 
        vault write transit/keys/admin type=ed25519

        # These users will be used in the examples to demonstrate the use of polymesh private transactions
        vault write transit/keys/signer1 type=ed25519
        vault write transit/keys/signer2 type=ed25519
        vault write transit/keys/signer3 type=ed25519
        vault write transit/keys/signer4 type=ed25519
    else
        echo "Transit engine already enabled"
    fi
}

# wait for Vault to be ready
READY=false
SECONDS_DELTA=$SECONDS
while [[ $(($SECONDS - $SECONDS_DELTA)) -lt "$TIMEOUT_SECONDS" ]]; do

    STATUS=$(vault status \
                  -format=json 2>/dev/null || true)

    if [ ${#STATUS} -gt 0 ]; then

      if [ $(echo "$STATUS" | jq -r .initialized) = false ]; then
          initialize_vault
      elif [ $(echo "$STATUS" | jq -r .sealed) = true ]; then
          echo "Vault is sealed, unsealing"
          unseal_vault
      fi

      CRITERIA=(
        '.type == "shamir"'
        'and .sealed == false'
        'and .storage_type == "file"'
        'and .initialized == true'
      )
      if [ $(echo "$STATUS" | jq -r "${CRITERIA[*]}") = true ]; then
          READY=true
          echo "Vault is ready"
          break
      fi
      
    fi

    sleep 1
done

if [ "$READY" = false ]; then
    >&2 echo "Timed out waiting for Vault to become ready after ${TIMEOUT_SECONDS}s"
    >&2 echo "Last Vault status: ${STATUS:-<no response from $VAULT_ADDR>}"
    exit 1
fi

# Output Vault Root Token
echo "Vault Root Token: $(cat /vault-token/.token)"

set_status "true"

###############################################################
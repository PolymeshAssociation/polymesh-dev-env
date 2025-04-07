#!/bin/sh

set -eu -o pipefail
export DEBIAN_FRONTEND=noninteractive

export API_URL=http://polymesh-rest-api-vault-sm:3000

# Install prerequisites
apk add --no-cache \
    curl \
    jq \
    postgresql16-client

# Function to set status in psql db
set_status() {
  psql -c "INSERT INTO status (service_name, service_available) VALUES ('rest-api-init', $1) ON CONFLICT (service_name) DO UPDATE SET service_available = EXCLUDED.service_available" > /dev/null
}

set_status "false"

# Function to get address
get_address() {
  local signer_name=$1
  local address=$(curl -sf -X 'GET' \
    "$API_URL/signer/$signer_name" \
    -H 'accept: application/json' \
    | jq -r .address)

  if [ -z "$address" ]; then
    echo "Failed to get the address for $signer_name" >&2
    exit 1
  fi

  echo "$address"
}

# Create on chain identities for the signers
create_identity() {
  local user_address=$1
  local user_role=$2 # e.g., Signer1, Signer2

  response=$(curl -s -X "POST" \
    "$API_URL/developer-testing/create-test-accounts" \
    -H "accept: application/json" \
    -H "Content-Type: application/json" \
    -d "{
    \"signer\": \"admin-1\",
    \"accounts\": [
      {
        \"address\": \"$user_address\",
        \"initialPolyx\": 100000
      }
    ]
  }" | jq -r .results[0].did )

  if [ -z "$response" ]; then
    echo "Failed to create an identity for the $user_role user" >&2
    exit 1
  fi

  echo "$user_role DiD: $response"
  # Convert role to lowercase for filename using POSIX-compliant tr
  user_role_lower=$(echo "$user_role" | tr '[:upper:]' '[:lower:]')
  echo "$response" > "/opt/polymesh-rest-api/status/${user_role_lower}_did"
}

# check if setup has already been completed
if [ -f /opt/polymesh-rest-api/status/.setup-complete ]; then

  for file in /opt/polymesh-rest-api/status/*_address; do
    echo "$(basename $file): $(cat $file)"
  done

  for file in /opt/polymesh-rest-api/status/*_did; do
    echo "$(basename $file): $(cat $file)"
  done

  set_status "true"

  echo "Setup has already been completed"

  exit 0
fi

###############################################################
# Get the addresses of the admin and signer1, signer2, signer3, signer4 users
# The signer names (e.g., "admin-1", "signer1-1") follow the format {name}-{version},
# which indicates the REST API is configured to use HashiCorp Vault as the signing manager.
# Other managers use different formats (e.g., Fireblocks: x-y-z, Local: any string).
echo "Getting the admin user address"
admin_address=$(get_address admin-1)
echo $admin_address > /opt/polymesh-rest-api/status/admin_address
echo "Admin user address: $admin_address"

echo "Getting the signer1, signer2, signer3, signer4 users addresses"
signer1_address=$(get_address signer1-1)
echo $signer1_address > /opt/polymesh-rest-api/status/signer1_address
echo "Signer1 user address: $signer1_address"

signer2_address=$(get_address signer2-1)
echo $signer2_address > /opt/polymesh-rest-api/status/signer2_address
echo "Signer2 user address: $signer2_address"

signer3_address=$(get_address signer3-1)
echo $signer3_address > /opt/polymesh-rest-api/status/signer3_address
echo "Signer3 user address: $signer3_address"

signer4_address=$(get_address signer4-1)
echo $signer4_address > /opt/polymesh-rest-api/status/signer4_address
echo "Signer4 user address: $signer4_address"

###############################################################
# Make the admin user a CDD Provider

echo "Making the admin user a CDD Provider"

response=$(curl -s -X "POST" \
  "$API_URL/developer-testing/create-test-admins" \
  -H "accept: application/json" \
  -H "Content-Type: application/json" \
  -d "{
  \"accounts\": [
    {
      \"address\": \"$admin_address\",
      \"initialPolyx\": 10000000
    }
  ]
}" | jq -r .results[0].did )

if [ -z "$response" ]; then
  echo "Failed to make the admin user a CDD Provider"
  exit 1
fi

echo "Admin user DiD: $response" # Admin DiD isn't saved to file, only echoed

###############################################################
# Create identities for signer1, signer2, signer3, signer4

create_identity "$signer1_address" "Signer1"
create_identity "$signer2_address" "Signer2"
create_identity "$signer3_address" "Signer3"
create_identity "$signer4_address" "Signer4"

###############################################################
# Create a file to mark the setup has been completed
touch /opt/polymesh-rest-api/status/.setup-complete

set_status "true"

echo "Setup has been completed"
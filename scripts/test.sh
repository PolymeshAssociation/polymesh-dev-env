#!/bin/bash

# This script sets up a Polymesh env, runs the tests and cleans up the environment

# Get the directory where this script is located, regardless of where it's called from
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

"${SCRIPT_DIR}/start-env.sh"

"${SCRIPT_DIR}/run-tests.sh"

"${SCRIPT_DIR}/stop-env.sh"



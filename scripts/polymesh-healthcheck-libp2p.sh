#!/bin/bash
set -exu -o pipefail
timeout 1 bash -c 'cat < /dev/null > /dev/tcp/127.0.0.1/30333' || exit 2
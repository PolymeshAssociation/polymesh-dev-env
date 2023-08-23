#!/bin/bash

/usr/local/bin/polymesh \
-d /var/lib/polymesh \
--unsafe-ws-external --unsafe-rpc-external --wasm-execution=compiled \
--no-prometheus --no-telemetry --pruning=archive --no-mdns \
--validator --rpc-cors=all --rpc-methods=unsafe --force-authoring \
--port 30333 $1

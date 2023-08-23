#!/bin/sh

psql -v ON_ERROR_STOP=1 -U postgres <<EOF
CREATE EXTENSION IF NOT EXISTS btree_gist;
SELECT * FROM pg_extension;
EOF
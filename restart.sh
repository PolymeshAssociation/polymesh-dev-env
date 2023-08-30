#! /bin/sh

docker compose down --volumes
docker compose up --force-recreate

#! /bin/sh

docker compose down --volumes
dockeer compose up --force-recreate

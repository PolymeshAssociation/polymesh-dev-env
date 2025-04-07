CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE DATABASE services_status;
GRANT ALL PRIVILEGES ON DATABASE services_status TO postgres;

\c services_status

CREATE TABLE status (
    service_name TEXT NOT NULL UNIQUE,
    service_available BOOLEAN NOT NULL
);
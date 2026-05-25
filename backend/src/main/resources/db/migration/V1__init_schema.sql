-- File: src/main/resources/db/migration/V1__init_schema.sql
-- Naming convention: V{version}__{description}.sql (double underscore required by Flyway)

-- Create PostgreSQL ENUM type first (before the table that uses it)
CREATE TYPE user_status AS ENUM ('ONLINE', 'OFFLINE');

-- Create users table
CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name  VARCHAR(100) NOT NULL,
    status        user_status  NOT NULL DEFAULT 'OFFLINE',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index for fast username lookup (login queries)
CREATE UNIQUE INDEX idx_users_username ON users (username);

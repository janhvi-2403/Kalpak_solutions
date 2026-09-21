-- ==============================================================================
-- Kalpak Solutions SaaS Platform - Initial Database Setup & RLS Baseline
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to retrieve the current active tenant ID from session settings
-- If the setting is missing or empty, it safely returns NULL.
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if the current session is executing with bypass RLS (e.g. Super Admin or background jobs)
CREATE OR REPLACE FUNCTION is_rls_bypassed() RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(NULLIF(current_setting('app.bypass_rls', true), '')::BOOLEAN, false);
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

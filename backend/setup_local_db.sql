-- Darshan Backend - Local Database Setup Script
-- Run this script to set up your local PostgreSQL database

-- Create database (run this as postgres superuser)
-- CREATE DATABASE darshan_backend;

-- Connect to the darshan_backend database and run the following:

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: public.users

-- DROP TABLE IF EXISTS public.users;

CREATE TABLE IF NOT EXISTS public.users
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    email character varying(255) COLLATE pg_catalog."default" NOT NULL,
    username character varying(100) COLLATE pg_catalog."default" NOT NULL,
    password_hash character varying(255) COLLATE pg_catalog."default" NOT NULL,
    full_name character varying(255) COLLATE pg_catalog."default",
    is_admin boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_login timestamp with time zone,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_username_key UNIQUE (username)
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Table: public.saved_locations

-- DROP TABLE IF EXISTS public.saved_locations;

CREATE TABLE IF NOT EXISTS public.saved_locations
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid,
    name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    description text COLLATE pg_catalog."default",
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    is_default boolean DEFAULT false,
    is_global boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT saved_locations_pkey PRIMARY KEY (id),
    CONSTRAINT saved_locations_name_key UNIQUE (name),
    CONSTRAINT saved_locations_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

-- Table: public.spiritual_activity

-- DROP TABLE IF EXISTS public.spiritual_activity;

CREATE TABLE IF NOT EXISTS public.spiritual_activity
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    activity_date date NOT NULL,
    japa_count integer DEFAULT 0,
    pranayama_count integer DEFAULT 0,
    darshan_count integer DEFAULT 0,
    japa_last_updated timestamp with time zone,
    pranayama_last_updated timestamp with time zone,
    darshan_last_updated timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT spiritual_activity_pkey PRIMARY KEY (id),
    CONSTRAINT unique_user_activity_date UNIQUE (user_id, activity_date),
    CONSTRAINT spiritual_activity_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);

-- Table: public.spiritual_activity_history

-- DROP TABLE IF EXISTS public.spiritual_activity_history;

CREATE TABLE IF NOT EXISTS public.spiritual_activity_history
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    activity_type character varying(50) COLLATE pg_catalog."default" NOT NULL,
    count_added integer NOT NULL,
    activity_date date NOT NULL,
    notes text COLLATE pg_catalog."default",
    location_id uuid,
    logged_at timestamp with time zone DEFAULT now(),
    CONSTRAINT spiritual_activity_history_pkey PRIMARY KEY (id),
    CONSTRAINT spiritual_activity_history_location_id_fkey FOREIGN KEY (location_id)
        REFERENCES public.saved_locations (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL,
    CONSTRAINT spiritual_activity_history_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT spiritual_activity_history_activity_type_check CHECK (activity_type::text = ANY (ARRAY['japa'::character varying, 'pranayama'::character varying, 'darshan'::character varying]::text[]))
);

-- Table: public.events

-- DROP TABLE IF EXISTS public.events;

CREATE TABLE IF NOT EXISTS public.events
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    title character varying(255) COLLATE pg_catalog."default" NOT NULL,
    description text COLLATE pg_catalog."default",
    location_name character varying(255) COLLATE pg_catalog."default",
    location_id uuid,
    event_date timestamp with time zone NOT NULL,
    created_by uuid NOT NULL,
    is_published boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT events_pkey PRIMARY KEY (id),
    CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT events_location_id_fkey FOREIGN KEY (location_id)
        REFERENCES public.saved_locations (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL
);

-- Insert sample admin user (password: admin123)
-- Password hash generated using bcrypt
INSERT INTO users (email, username, password_hash, full_name, is_admin, is_active) 
VALUES (
    'admin@darshan.com',
    'admin',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3L3jzjvG4i',
    'System Administrator',
    TRUE,
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Insert sample regular user (password: user123)
INSERT INTO users (email, username, password_hash, full_name, is_admin, is_active) 
VALUES (
    'user@darshan.com',
    'testuser',
    '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Test User',
    FALSE,
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Insert sample location (ISKCON Bangalore)
INSERT INTO saved_locations (name, description, latitude, longitude, is_global) 
VALUES (
    'ISKCON Bangalore',
    'Sri Radha Krishna Temple, Rajajinagar, Bangalore',
    12.9716,
    77.5946,
    TRUE
) ON CONFLICT (name) DO NOTHING;

-- Insert sample location (ISKCON Mayapur)
INSERT INTO saved_locations (name, description, latitude, longitude, is_global) 
VALUES (
    'ISKCON Mayapur',
    'Sri Mayapur Chandrodaya Mandir, West Bengal',
    23.4241,
    88.3967,
    TRUE
) ON CONFLICT (name) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spiritual_activities_updated_at 
    BEFORE UPDATE ON spiritual_activity 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- Verify setup
SELECT 'Database setup completed successfully!' as status;
SELECT 'Users created: ' || COUNT(*) as user_count FROM users;
SELECT 'Locations created: ' || COUNT(*) as location_count FROM saved_locations;
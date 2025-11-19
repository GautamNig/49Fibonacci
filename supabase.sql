-- Drop existing tables if they exist
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS tiles CASCADE;
DROP TABLE IF EXISTS celebrities CASCADE;
DROP TABLE IF EXISTS game_state CASCADE;

CREATE TABLE system_state (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial state
INSERT INTO system_state (key, value) 
VALUES ('purchase_in_progress', 'false');

-- Celebrities table with image support
CREATE TABLE celebrities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255),
    profile_image_url TEXT,
    quote TEXT,
    description TEXT,
    total_tiles INTEGER DEFAULT 0,
    total_spent DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Tiles table with enhanced data
CREATE TABLE tiles (
    id INTEGER PRIMARY KEY, -- 0-48 for 49 tiles
    owner_id UUID REFERENCES celebrities(id),
    purchase_price DECIMAL(15,2),
    purchased_at TIMESTAMP WITH TIME ZONE,
    is_purchased BOOLEAN DEFAULT FALSE,
    weightage DECIMAL(5,2) DEFAULT 0,
    personal_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Transactions table for history
CREATE TABLE transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tile_id INTEGER REFERENCES tiles(id),
    celebrity_id UUID REFERENCES celebrities(id),
    price DECIMAL(15,2) NOT NULL,
    transaction_time TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Game state table
CREATE TABLE game_state (
    id INTEGER PRIMARY KEY DEFAULT 1, -- Single row
    total_purchased INTEGER DEFAULT 0,
    current_price DECIMAL(15,2) DEFAULT 1,
    CHECK (id = 1)
);

DROP TABLE IF EXISTS app_config CASCADE;
-- Updated app_config with tile range
CREATE TABLE app_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    total_tiles INTEGER DEFAULT 49,
    grid_columns INTEGER DEFAULT 7,
    tile_range_start INTEGER DEFAULT 0,  -- Starting tile ID
    tile_range_end INTEGER DEFAULT 48,   -- Ending tile ID
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    CHECK (id = 1)
);

-- Insert initial config for tiles 45-49
INSERT INTO app_config (id, total_tiles, grid_columns, tile_range_start, tile_range_end) 
VALUES (1, 5, 5, 45, 49);

-- Enable Row Level Security
ALTER TABLE celebrities ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access for celebrities" ON celebrities FOR SELECT USING (true);
CREATE POLICY "Allow public read access for tiles" ON tiles FOR SELECT USING (true);
CREATE POLICY "Allow public read access for transactions" ON transactions FOR SELECT USING (true);
CREATE POLICY "Allow public read access for game_state" ON game_state FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public read access for app_config" ON storage.objects;
CREATE POLICY "Allow public read access for app_config" ON app_config FOR SELECT USING (true);

-- Allow inserts and updates for tiles and celebrities
CREATE POLICY "Allow insert for celebrities" ON celebrities FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for celebrities" ON celebrities FOR UPDATE USING (true);
CREATE POLICY "Allow update for tiles" ON tiles FOR UPDATE USING (true);
CREATE POLICY "Allow update for game_state" ON game_state FOR UPDATE USING (true);
CREATE POLICY "Allow insert for transactions" ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for app_config" ON app_config FOR UPDATE USING (true);

-- Insert initial tiles (0-49)
INSERT INTO tiles (id) VALUES 
(0), (1), (2), (3), (4), (5), (6), (7), (8), (9),
(10), (11), (12), (13), (14), (15), (16), (17), (18), (19),
(20), (21), (22), (23), (24), (25), (26), (27), (28), (29),
(30), (31), (32), (33), (34), (35), (36), (37), (38), (39),
(40), (41), (42), (43), (44), (45), (46), (47), (48), (49);

-- Insert initial game state
INSERT INTO game_state (id, total_purchased, current_price) VALUES (1, 0, 1);

-- Updated function to handle tile range
CREATE OR REPLACE FUNCTION update_unpurchased_tile_weightages()
RETURNS void AS $$
DECLARE
    v_total_purchased INTEGER;
    v_current_price DECIMAL(15,2);
    v_total_universe_value DECIMAL(15,2);
    v_tile_range_start INTEGER;
    v_tile_range_end INTEGER;
    v_total_tiles INTEGER;
BEGIN
    -- Get current game state
    SELECT total_purchased, current_price INTO v_total_purchased, v_current_price 
    FROM game_state WHERE id = 1;
    
    -- Get tile range from config
    SELECT tile_range_start, tile_range_end, total_tiles 
    INTO v_tile_range_start, v_tile_range_end, v_total_tiles 
    FROM app_config WHERE id = 1;
    
    -- Calculate total universe value for the configured range
    v_total_universe_value := calculate_total_tile_cost_range(v_tile_range_start, v_tile_range_end);
    
    -- Update weightages for all unpurchased tiles within the configured range
    UPDATE tiles 
    SET weightage = (v_current_price / v_total_universe_value) * 100,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE is_purchased = FALSE 
      AND id BETWEEN v_tile_range_start AND v_tile_range_end;
    
    RAISE NOTICE 'Updated weightages: % purchased, tiles %-% , current price %, total value %', 
        v_total_purchased, v_tile_range_start, v_tile_range_end, v_current_price, v_total_universe_value;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate total cost for a specific tile range
CREATE OR REPLACE FUNCTION calculate_total_tile_cost_range(range_start INTEGER, range_end INTEGER)
RETURNS DECIMAL(30,2) AS $$
DECLARE
    total_cost DECIMAL(30,2) := 0;
    i INTEGER;
BEGIN
    FOR i IN range_start..range_end LOOP
        total_cost := total_cost + get_fibonacci_price(i);
    END LOOP;
    RETURN total_cost;
END;
$$ LANGUAGE plpgsql;

-- Updated function to get total universe value for configured range
CREATE OR REPLACE FUNCTION get_total_universe_value()
RETURNS DECIMAL(30,2) AS $$
DECLARE
    range_start INTEGER;
    range_end INTEGER;
BEGIN
    SELECT tile_range_start, tile_range_end INTO range_start, range_end FROM app_config WHERE id = 1;
    RETURN calculate_total_tile_cost_range(range_start, range_end);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_fibonacci_price(n INTEGER)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    a DECIMAL(30,2) := 1;
    b DECIMAL(30,2) := 1;
    i INTEGER;
BEGIN
    IF n < 2 THEN
        RETURN 1;
    END IF;
    
    FOR i IN 2..n LOOP
        b := a + b;
        a := b - a;
    END LOOP;
    
    RETURN b;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_total_tile_cost(total_tiles INTEGER)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    total_cost DECIMAL(15,2) := 0;
    i INTEGER;
BEGIN
    FOR i IN 0..(total_tiles - 1) LOOP
        total_cost := total_cost + get_fibonacci_price(i);
    END LOOP;
    RETURN total_cost;
END;
$$ LANGUAGE plpgsql;

-- Updated purchase_tile function with range validation
CREATE OR REPLACE FUNCTION purchase_tile(
    p_tile_id INTEGER,
    p_celebrity_name VARCHAR(100),
    p_celebrity_email VARCHAR(255),
    p_profile_image_url TEXT,
    p_quote TEXT,
    p_description TEXT,
    p_personal_message TEXT,
    p_purchase_price DECIMAL(15,2)
) RETURNS UUID AS $$
DECLARE
    v_celeb_id UUID;
    v_current_total INTEGER;
    v_total_universe_value DECIMAL(15,2);
    v_weightage DECIMAL(5,2);
    v_tile_range_start INTEGER;
    v_tile_range_end INTEGER;
    v_total_tiles INTEGER;
BEGIN
    -- Get tile range from config
    SELECT tile_range_start, tile_range_end, total_tiles 
    INTO v_tile_range_start, v_tile_range_end, v_total_tiles 
    FROM app_config WHERE id = 1;
    
    -- Validate tile ID is within configured range
    IF p_tile_id < v_tile_range_start OR p_tile_id > v_tile_range_end THEN
        RAISE EXCEPTION 'Tile ID % is not in configured range %-%', p_tile_id, v_tile_range_start, v_tile_range_end;
    END IF;
    
    -- Insert or get celebrity with enhanced data
    INSERT INTO celebrities (name, email, profile_image_url, quote, description) 
    VALUES (p_celebrity_name, p_celebrity_email, p_profile_image_url, p_quote, p_description)
    ON CONFLICT (name) DO UPDATE SET
        email = EXCLUDED.email,
        profile_image_url = EXCLUDED.profile_image_url,
        quote = EXCLUDED.quote,
        description = EXCLUDED.description,
        total_tiles = celebrities.total_tiles + 1,
        total_spent = celebrities.total_spent + p_purchase_price,
        updated_at = TIMEZONE('utc'::text, NOW())
    RETURNING id INTO v_celeb_id;

    -- Calculate total universe value using configured range
    v_total_universe_value := calculate_total_tile_cost_range(v_tile_range_start, v_tile_range_end);

    -- Calculate weightage for the purchased tile
    v_weightage := (p_purchase_price / v_total_universe_value) * 100;
    v_weightage := ROUND(v_weightage, 4);

    -- Update tile
    UPDATE tiles 
    SET owner_id = v_celeb_id,
        purchase_price = p_purchase_price,
        purchased_at = TIMEZONE('utc'::text, NOW()),
        personal_message = p_personal_message,
        weightage = v_weightage,
        is_purchased = TRUE,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = p_tile_id;

    -- Record transaction
    INSERT INTO transactions (tile_id, celebrity_id, price)
    VALUES (p_tile_id, v_celeb_id, p_purchase_price);

    -- Update game state - increment total purchased and set next price
    UPDATE game_state 
    SET total_purchased = total_purchased + 1,
        current_price = get_fibonacci_price(v_tile_range_start + total_purchased + 1)
    WHERE id = 1
    RETURNING total_purchased INTO v_current_total;

    -- Update celebrity stats
    UPDATE celebrities 
    SET total_tiles = total_tiles + 1,
        total_spent = total_spent + p_purchase_price,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = v_celeb_id;

    -- Update weightages for all unpurchased tiles using the helper function
    PERFORM update_unpurchased_tile_weightages();

    RETURN v_celeb_id;
END;
$$ LANGUAGE plpgsql;

-- Allow public image uploads (run in Supabase SQL editor)
CREATE POLICY "Allow public image uploads" ON storage.objects
FOR INSERT TO public WITH CHECK (bucket_id = 'celebrity-images');

CREATE POLICY "Allow public image access" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'celebrity-images');

-- Enable RLS for app_config
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiles REPLICA IDENTITY FULL;
ALTER TABLE game_state REPLICA IDENTITY FULL;
ALTER TABLE celebrities REPLICA IDENTITY FULL;
ALTER TABLE transactions REPLICA IDENTITY FULL;

-- Enable real-time for all tables
BEGIN;
  -- Drop existing publications if any
  DROP PUBLICATION IF EXISTS supabase_realtime CASCADE;
  
  -- Create new publication
  CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
COMMIT;

-- Verify publication
SELECT * FROM pg_publication;

-- Verify tables are in publication
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- Enable public access to storage bucket
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'celebrity-images');

CREATE POLICY "Allow public upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'celebrity-images');

CREATE POLICY "Allow public update" ON storage.objects
FOR UPDATE USING (bucket_id = 'celebrity-images');

-- Enable public access to celebrity-images bucket
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'celebrity-images');

DROP POLICY IF EXISTS "Allow public upload" ON storage.objects;
CREATE POLICY "Allow public upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'celebrity-images');

DROP POLICY IF EXISTS "Allow public update" ON storage.objects;
CREATE POLICY "Allow public update" ON storage.objects
FOR UPDATE USING (bucket_id = 'celebrity-images');

CREATE OR REPLACE FUNCTION update_tile_weightages_on_game_change()
RETURNS trigger AS $$
BEGIN
    PERFORM update_unpurchased_tile_weightages();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS game_state_change_weightage_trigger ON game_state;
CREATE TRIGGER game_state_change_weightage_trigger
    AFTER UPDATE ON game_state
    FOR EACH ROW
    EXECUTE FUNCTION update_tile_weightages_on_game_change();
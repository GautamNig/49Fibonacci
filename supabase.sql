-- Drop existing tables if they exist
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS tiles CASCADE;
DROP TABLE IF EXISTS celebrities CASCADE;
DROP TABLE IF EXISTS game_state CASCADE;

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

-- Enable Row Level Security
ALTER TABLE celebrities ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access for celebrities" ON celebrities FOR SELECT USING (true);
CREATE POLICY "Allow public read access for tiles" ON tiles FOR SELECT USING (true);
CREATE POLICY "Allow public read access for transactions" ON transactions FOR SELECT USING (true);
CREATE POLICY "Allow public read access for game_state" ON game_state FOR SELECT USING (true);

-- Allow inserts and updates for tiles and celebrities
CREATE POLICY "Allow insert for celebrities" ON celebrities FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for celebrities" ON celebrities FOR UPDATE USING (true);
CREATE POLICY "Allow update for tiles" ON tiles FOR UPDATE USING (true);
CREATE POLICY "Allow update for game_state" ON game_state FOR UPDATE USING (true);
CREATE POLICY "Allow insert for transactions" ON transactions FOR INSERT WITH CHECK (true);

-- Insert initial tiles (0-48)
INSERT INTO tiles (id) VALUES 
(0), (1), (2), (3), (4), (5), (6), (7), (8), (9),
(10), (11), (12), (13), (14), (15), (16), (17), (18), (19),
(20), (21), (22), (23), (24), (25), (26), (27), (28), (29),
(30), (31), (32), (33), (34), (35), (36), (37), (38), (39),
(40), (41), (42), (43), (44), (45), (46), (47), (48);

-- Insert initial game state
INSERT INTO game_state (id, total_purchased, current_price) VALUES (1, 0, 1);

DROP FUNCTION IF EXISTS purchase_tile;

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
BEGIN
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

    -- Update tile with personal message
    UPDATE tiles 
    SET owner_id = v_celeb_id,
        purchase_price = p_purchase_price,
        purchased_at = TIMEZONE('utc'::text, NOW()),
        personal_message = p_personal_message,
        is_purchased = TRUE,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = p_tile_id;

    -- Record transaction
    INSERT INTO transactions (tile_id, celebrity_id, price)
    VALUES (p_tile_id, v_celeb_id, p_purchase_price);

    -- Update game state - use Fibonacci calculation from application
    UPDATE game_state 
    SET total_purchased = total_purchased + 1,
        current_price = p_purchase_price * 2
    WHERE id = 1
    RETURNING total_purchased INTO v_current_total;

    -- Update celebrity stats
    UPDATE celebrities 
    SET total_tiles = total_tiles + 1,
        total_spent = total_spent + p_purchase_price,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = v_celeb_id;

    RETURN v_celeb_id;
END;
$$ LANGUAGE plpgsql;


-- Allow public image uploads (run in Supabase SQL editor)
CREATE POLICY "Allow public image uploads" ON storage.objects
FOR INSERT TO public WITH CHECK (bucket_id = 'celebrity-images');

CREATE POLICY "Allow public image access" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'celebrity-images');


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
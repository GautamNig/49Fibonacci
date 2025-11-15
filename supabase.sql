-- Create tables for 49Fibonacci Tiles

-- Celebrities table
CREATE TABLE celebrities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    total_tiles INTEGER DEFAULT 0,
    total_spent DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Tiles table
CREATE TABLE tiles (
    id INTEGER PRIMARY KEY, -- 0-48 for 49 tiles
    owner_id UUID REFERENCES celebrities(id),
    purchase_price DECIMAL(15,2),
    purchased_at TIMESTAMP WITH TIME ZONE,
    is_purchased BOOLEAN DEFAULT FALSE,
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

-- Create policies for public read access (adjust as needed)
CREATE POLICY "Allow public read access for celebrities" ON celebrities FOR SELECT USING (true);
CREATE POLICY "Allow public read access for tiles" ON tiles FOR SELECT USING (true);
CREATE POLICY "Allow public read access for transactions" ON transactions FOR SELECT USING (true);
CREATE POLICY "Allow public read access for game_state" ON game_state FOR SELECT USING (true);

-- Insert initial tiles (0-48)
INSERT INTO tiles (id) VALUES 
(0), (1), (2), (3), (4), (5), (6), (7), (8), (9),
(10), (11), (12), (13), (14), (15), (16), (17), (18), (19),
(20), (21), (22), (23), (24), (25), (26), (27), (28), (29),
(30), (31), (32), (33), (34), (35), (36), (37), (38), (39),
(40), (41), (42), (43), (44), (45), (46), (47), (48);

-- Insert initial game state
INSERT INTO game_state (id, total_purchased, current_price) VALUES (1, 0, 1);

-- Create function to handle tile purchase
CREATE OR REPLACE FUNCTION purchase_tile(
    tile_id INTEGER,
    celebrity_name VARCHAR(100),
    purchase_price DECIMAL(15,2)
) RETURNS UUID AS $$
DECLARE
    celeb_id UUID;
    current_total INTEGER;
    next_price DECIMAL(15,2);
BEGIN
    -- Insert or get celebrity
    INSERT INTO celebrities (name) 
    VALUES (celebrity_name)
    ON CONFLICT (name) DO UPDATE SET
        total_tiles = celebrities.total_tiles + 1,
        total_spent = celebrities.total_spent + purchase_price,
        updated_at = TIMEZONE('utc'::text, NOW())
    RETURNING id INTO celeb_id;

    -- Update tile
    UPDATE tiles 
    SET owner_id = celeb_id,
        purchase_price = purchase_price,
        purchased_at = TIMEZONE('utc'::text, NOW()),
        is_purchased = TRUE,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = tile_id;

    -- Record transaction
    INSERT INTO transactions (tile_id, celebrity_id, price)
    VALUES (tile_id, celeb_id, purchase_price);

    -- Update game state
    UPDATE game_state 
    SET total_purchased = total_purchased + 1,
        current_price = POWER(2, total_purchased) -- Using power for Fibonacci would be complex, we'll handle in app
    WHERE id = 1
    RETURNING total_purchased INTO current_total;

    -- Update celebrity stats
    UPDATE celebrities 
    SET total_tiles = total_tiles + 1,
        total_spent = total_spent + purchase_price,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = celeb_id;

    RETURN celeb_id;
END;
$$ LANGUAGE plpgsql;
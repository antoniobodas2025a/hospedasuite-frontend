-- Room detail enhancement: bed type, bathroom, size, view
-- Adds fields that matter most to guests (34% bed + 28% bathroom influence)

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS bed_type TEXT CHECK (bed_type IN ('individual', 'doble', 'queen', 'king', 'litera'));
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS bathroom_type TEXT CHECK (bathroom_type IN ('privado', 'compartido', 'en-suite', 'exterior'));
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS shower_type TEXT CHECK (shower_type IN ('ducha', 'bañera', 'ambos', 'ninguno'));
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS hot_water BOOLEAN DEFAULT true;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_size TEXT CHECK (room_size IN ('pequeno', 'mediano', 'grande', 'suite'));
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_view TEXT CHECK (room_view IN ('interior', 'exterior', 'jardin', 'mar', 'montana', 'ciudad'));

-- Indexes for common OTA filters
CREATE INDEX IF NOT EXISTS idx_rooms_bed_type ON rooms(bed_type);
CREATE INDEX IF NOT EXISTS idx_rooms_bathroom_type ON rooms(bathroom_type);
CREATE INDEX IF NOT EXISTS idx_rooms_hot_water ON rooms(hot_water);

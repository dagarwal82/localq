-- Drop old imageUrl column from products
ALTER TABLE products DROP COLUMN IF EXISTS image_url;

-- Create product_images table
CREATE TABLE IF NOT EXISTS product_images (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id varchar NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT unique_product_image_order UNIQUE (product_id, sort_order)
);
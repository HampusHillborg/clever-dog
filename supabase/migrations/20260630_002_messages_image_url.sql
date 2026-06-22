-- Image attachments in chat. A message may carry an image (image_url) with an
-- optional text body. body stays NOT NULL for backward compat; image-only
-- messages store an empty string in body.
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS image_url text;

-- Chat image storage bucket. Public read (URLs use unguessable per-customer
-- UUID paths); authenticated users (customers + staff) may upload.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-images',
  'chat-images',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "authenticated upload to chat-images" ON storage.objects;
CREATE POLICY "authenticated upload to chat-images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-images');

DROP POLICY IF EXISTS "public read chat-images" ON storage.objects;
CREATE POLICY "public read chat-images" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'chat-images');

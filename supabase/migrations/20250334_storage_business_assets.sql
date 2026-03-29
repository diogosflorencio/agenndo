-- Bucket público para logo, capa e galeria (path: {business_id}/...)
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-assets', 'business-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "business_assets_public_read" ON storage.objects;
CREATE POLICY "business_assets_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'business-assets');

DROP POLICY IF EXISTS "business_assets_insert" ON storage.objects;
CREATE POLICY "business_assets_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'business-assets'
    AND split_part(name, '/', 1) IN (
      SELECT b.id::text FROM public.businesses b WHERE b.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "business_assets_update" ON storage.objects;
CREATE POLICY "business_assets_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'business-assets'
    AND split_part(name, '/', 1) IN (
      SELECT b.id::text FROM public.businesses b WHERE b.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "business_assets_delete" ON storage.objects;
CREATE POLICY "business_assets_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'business-assets'
    AND split_part(name, '/', 1) IN (
      SELECT b.id::text FROM public.businesses b WHERE b.profile_id = auth.uid()
    )
  );

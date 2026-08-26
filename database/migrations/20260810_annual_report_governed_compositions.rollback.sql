begin;

update holiday_theme_assets
set asset_metadata = coalesce(asset_metadata, '{}'::jsonb) - 'completeComposition',
  updated_at = now()
where intended_festival = 'annual-report-season'
  and checksum_sha256 in (
    '2f331084cf8489dcd18a5a86516270d12624d090a35740984f37e39c865b4514',
    '196c3ae5a2834cc7958b58a2e9bb88e45481c6dd09f0dcde71f867714bd216ee',
    'e2ec1b89daa15cabcae2e58e6184c810f11230e7473c04f1a33b5de0c168f685',
    '50fb4f6ec959e6507be6975c27427816ed62f901f841da917317552527298751',
    '4f31e7a63e497c9c538e3bf49606ef18e1ca86e4cc7cf45f7153493fd867ccf8',
    '3cd0ffb2814debee290057c71b9455f85f7b09b7a57ff1bec0574b543428ee03'
  );

commit;

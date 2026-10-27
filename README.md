# Jigsaw Puzzle Builder

A browser-based jigsaw app that lets you upload an image, choose puzzle dimensions, and share a short link. Drag and drop pieces onto each other to swap them. The original image appears below the puzzle as a reference. Opening a shared link shows only the puzzle board and reference image, so players can solve it without the upload and creator controls.

## Run locally

Open `index.html` directly or serve the project folder locally. Puzzle sharing requires the app to be hosted publicly and connected to Supabase.

## Configure puzzle storage

Shared puzzles and optimized image files are stored in Supabase. Images are resized to at most 1400 pixels on the longest edge, converted to WebP, and limited to 2 MB. Anyone with a puzzle link can read its image and play it.

1. Create a Supabase project.
2. In the Supabase SQL Editor, run:

   ```sql
   create table if not exists public.puzzles (
     id uuid primary key,
     rows integer not null check (rows between 2 and 6),
     cols integer not null check (cols between 2 and 6),
     pieces integer[] not null,
     image_path text not null,
     created_at timestamptz not null default now()
   );

   alter table public.puzzles enable row level security;
   grant select, insert on public.puzzles to anon;

   drop policy if exists "Anyone can read shared puzzles" on public.puzzles;
   create policy "Anyone can read shared puzzles"
     on public.puzzles for select to anon using (true);

   drop policy if exists "Anyone can create shared puzzles" on public.puzzles;
   create policy "Anyone can create shared puzzles"
     on public.puzzles for insert to anon with check (
       rows between 2 and 6 and
       cols between 2 and 6 and
       cardinality(pieces) = rows * cols
     );

   insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
   values ('puzzles', 'puzzles', true, 2097152, array['image/webp'])
   on conflict (id) do update set
     public = excluded.public,
     file_size_limit = excluded.file_size_limit,
     allowed_mime_types = excluded.allowed_mime_types;

   drop policy if exists "Anyone can upload puzzle images" on storage.objects;
   create policy "Anyone can upload puzzle images"
     on storage.objects for insert to anon
     with check (bucket_id = 'puzzles');
   ```

3. In the Supabase project settings, copy the **Project URL** and the **anon/public key**.
4. Put those values in `config.js`:

   ```js
   window.JIGSAW_CONFIG = {
     supabaseUrl: "https://YOUR_PROJECT_ID.supabase.co",
     supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY",
   };
   ```

   The anon/public key is intended for browser use. Never put a Supabase `service_role` key in this app or commit it.
5. Commit and push `config.js` to `feature/jigsaw-puzzler`. The existing GitHub Pages workflow will publish the changes.

To share: open the public GitHub Pages site, upload an image, choose the rows and columns, and select **Create puzzle**. Copy the generated short link. The image is uploaded to the public `puzzles` bucket; do not use confidential images.

Because puzzle creation is public and does not require player accounts, the Supabase anon key must only be used with the policies above. For a widely used app, add server-side abuse prevention and rate limits.

## GitHub Pages

The `.github/workflows/pages.yml` workflow deploys pushes to `feature/jigsaw-puzzler`. GitHub Pages must use **GitHub Actions** as its publishing source.

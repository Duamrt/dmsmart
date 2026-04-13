// supabase-client.js — cliente Supabase do dmsmart
// ANON KEY apenas — service_role NUNCA aqui.
// Depende da SDK carregada via CDN (ver index.html).

const SUPA = window.supabase.createClient(
  'https://ojuzuojdjnhqiuwvhstv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdXp1b2pkam5ocWl1d3Zoc3R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTkzMDMsImV4cCI6MjA5MTY3NTMwM30.UbIEp08Xx54vdzNHpY9ue6UO19n1vjUA6O78TQGXJlA'
);

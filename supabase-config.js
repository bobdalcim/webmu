// Chave "anon"/"publishable" — feita para ficar no client, protegida pelas
// políticas de RLS do banco (ver README.md).

const SUPABASE_URL = 'https://qgrdlglzadsriluzeren.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_-s554Nv0F7DFE0aXn3jWwA_ti6iXccm';

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

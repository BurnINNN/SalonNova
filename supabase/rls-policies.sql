-- ============================================================
-- ROW LEVEL SECURITY (RLS) — À exécuter dans l'éditeur SQL Supabase
-- ============================================================

-- Activer RLS sur toutes les tables
ALTER TABLE salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Fonction helper : récupère le salonId de l'utilisateur connecté
CREATE OR REPLACE FUNCTION get_user_salon_id()
RETURNS TEXT AS $$
  SELECT salon_id FROM employees WHERE user_id = auth.uid()::text LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Politique de lecture : un employé ne voit que les données de son salon
CREATE POLICY "Salon isolation read" ON salons
  FOR SELECT USING (id = get_user_salon_id());

CREATE POLICY "Salon isolation read" ON employees
  FOR SELECT USING (salon_id = get_user_salon_id());

CREATE POLICY "Salon isolation all" ON services
  FOR ALL USING (salon_id = get_user_salon_id());

CREATE POLICY "Salon isolation all" ON clients
  FOR ALL USING (salon_id = get_user_salon_id());

CREATE POLICY "Salon isolation all" ON appointments
  FOR ALL USING (salon_id = get_user_salon_id());

CREATE POLICY "Salon isolation all" ON conversations
  FOR ALL USING (salon_id = get_user_salon_id());

CREATE POLICY "Salon isolation all" ON messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE salon_id = get_user_salon_id()
    )
  );

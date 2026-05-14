-- ============================================
-- TechSupport Pro - Seed Data
-- ============================================

-- 1. SEED CATEGORIES
INSERT INTO categories (name, slug) VALUES 
('Informática/TI', 'ti'),
('Elétrica', 'electrical'),
('Predial/Civil', 'building'),
('Segurança Eletrônica', 'security'),
('Telecomunicações', 'telecom')
ON CONFLICT (slug) DO NOTHING;

-- 2. SEED STATUSES
INSERT INTO statuses (name, slug) VALUES 
('Aberto', 'open'),
('Em Atendimento', 'in-progress'),
('Aguardando Peças', 'waiting'),
('Resolvido', 'resolved'),
('Fechado', 'closed')
ON CONFLICT (slug) DO NOTHING;

-- 3. SEED USERS (Example - Note: auth.users usually requires auth.signUp)
-- However, we can add profiles if the users exist.
-- Since we can't easily add to auth.users via SQL without extensions/admin privileges,
-- we'll assume the trigger handle_new_user will handle profile creation when they sign up.
-- For demonstration, we'll just populate some tickets with dummy UUIDs or wait for real users.

-- 4. SEED TICKETS (using some placeholder UUIDs or nulls)
-- We will use the IDs from the categories and statuses.
INSERT INTO tickets (ticket_id, subject, category, priority, status, description, created_at) VALUES
('#TK-8902', 'Falha de conexão VPN', 'ti', 'critical', 'open', 'Usuário do setor financeiro não consegue conectar na VPN corporativa. Já tentou reiniciar o computador e o modem.', NOW() - INTERVAL '5 days'),
('#TK-8895', 'Substituição de Lâmpadas Setor B', 'electrical', 'medium', 'in-progress', 'Três lâmpadas queimadas no corredor principal do Setor B. Necessário substituição com urgência.', NOW() - INTERVAL '3 days'),
('#TK-8880', 'Câmera 04 Offline (Portaria)', 'security', 'high', 'waiting', 'Câmera de segurança da portaria principal parou de transmitir imagens. Já foi verificado cabeamento.', NOW() - INTERVAL '1 day'),
('#TK-8872', 'Vazamento Ar Condicionado', 'building', 'medium', 'open', 'Vazamento intenso de água no duto central do ar condicionado. Risco de danos aos equipamentos próximos.', NOW()),
('#TK-8865', 'Troca de nobreak', 'electrical', 'low', 'resolved', 'Nobreak do servidor está emitindo alerta sonoro. Necessário substituição.', NOW() - INTERVAL '10 days'),
('#TK-8851', 'Configuração de e-mail no celular', 'ti', 'low', 'closed', 'Usuário não consegue configurar e-mail corporativo no celular Android.', NOW() - INTERVAL '15 days')
ON CONFLICT (ticket_id) DO NOTHING;

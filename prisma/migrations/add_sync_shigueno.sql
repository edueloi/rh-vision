-- Adiciona flag de sincronização com portal Shigueno na tabela tenants
ALTER TABLE tenants ADD COLUMN sync_shigueno TINYINT(1) NOT NULL DEFAULT 0;

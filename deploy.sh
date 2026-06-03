#!/bin/bash
# =============================================================================
# deploy.sh — Triagem Smart
# Uso primeiro deploy:   bash deploy.sh --setup
# Uso atualização:       bash deploy.sh
# =============================================================================

set -e
APP_DIR="/var/www/triagem-smart"
APP_NAME="triagem-smart"
DB_NAME="triagem_smart"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✔] $1${NC}"; }
warn() { echo -e "${YELLOW}[!] $1${NC}"; }
fail() { echo -e "${RED}[✗] $1${NC}"; exit 1; }

# =============================================================================
# MODO SETUP — apenas no primeiro deploy
# =============================================================================
if [[ "$1" == "--setup" ]]; then
  warn "Modo SETUP — configuração inicial do servidor"

  # Criar banco de dados MySQL
  log "Criando banco de dados $DB_NAME..."
  mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" \
    || fail "Erro ao criar banco de dados"

  # Clonar repositório
  log "Clonando repositório..."
  mkdir -p /var/www
  cd /var/www
  git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git $APP_DIR \
    || fail "Erro ao clonar repositório. Ajuste a URL do repo neste script."

  cd $APP_DIR

  # Copiar .env
  if [ ! -f ".env" ]; then
    warn ".env não encontrado — copiando .env.production como base..."
    cp .env.production .env
    warn "EDITE o .env agora: nano $APP_DIR/.env"
    warn "Preencha DATABASE_URL, OPENAI_API_KEY, APP_URL e demais variáveis."
    echo ""
    warn "Depois execute:  bash deploy.sh  (sem --setup)"
    exit 0
  fi

  # Criar pasta de logs do PM2
  mkdir -p /var/log/pm2

  # Criar pasta de uploads
  mkdir -p $APP_DIR/uploads
  chmod 755 $APP_DIR/uploads

  # Configurar nginx
  log "Configurando nginx..."
  cp $APP_DIR/nginx.conf /etc/nginx/sites-available/$APP_NAME
  ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/$APP_NAME
  nginx -t && systemctl reload nginx
  log "Nginx configurado. Execute certbot para SSL:"
  warn "  certbot --nginx -d triagemsmart.develoi.com.br"

  log "Setup concluído! Agora execute:  bash deploy.sh"
  exit 0
fi

# =============================================================================
# DEPLOY / ATUALIZAÇÃO
# =============================================================================
log "Iniciando deploy do $APP_NAME..."
cd $APP_DIR

# 1. Atualizar código
log "Atualizando código (git pull)..."
git pull

# 2. Instalar dependências
log "Instalando dependências..."
npm install --legacy-peer-deps

# 3. Gerar Prisma client
log "Gerando Prisma client..."
npx prisma generate

# 4. Rodar migrations
log "Rodando migrations..."
node migrate.js

# 5. Build do frontend (Vite)
log "Compilando frontend (vite build)..."
npm run build

# 6. Reiniciar PM2
log "Reiniciando PM2..."
if pm2 list | grep -q "$APP_NAME"; then
  pm2 restart $APP_NAME --update-env
else
  pm2 start ecosystem.config.cjs --env production
  pm2 save
fi

log "Deploy concluído! ✔"
echo ""
echo "  Logs:   pm2 logs $APP_NAME --lines 50"
echo "  Status: pm2 status"
echo "  URL:    https://triagemsmart.develoi.com.br"

# Pata Limpa CRM — Guia de Deploy (Hostinger / VPS)

Este guia explica como fazer o deploy do **Pata Limpa CRM** em qualquer servidor Node.js padrão — Hostinger, Railway, Render, VPS com Ubuntu/Debian, etc.

O arquivo `pata-limpa-crm.zip` contém tudo que você precisa. Nenhuma etapa de compilação é necessária no servidor.

---

## Pré-requisitos no servidor

| Componente | Versão mínima |
|---|---|
| Node.js | **22** ou superior |
| PostgreSQL | **14** ou superior |
| (Opcional) PM2 | qualquer versão recente |
| (Opcional) Nginx | qualquer versão recente |

Para verificar as versões instaladas:
```bash
node --version
psql --version
```

---

## 1. Criar o banco de dados PostgreSQL

Conecte no PostgreSQL com um usuário administrador e crie o banco e o usuário da aplicação:

```sql
CREATE USER patalimpa WITH PASSWORD 'troque-por-senha-forte';
CREATE DATABASE patalimpa_db OWNER patalimpa;
GRANT ALL PRIVILEGES ON DATABASE patalimpa_db TO patalimpa;
```

---

## 2. Importar o dump do banco de dados

O arquivo `pata-limpa-crm.sql` contém o schema completo e todos os dados atuais:

```bash
psql "postgres://patalimpa:troque-por-senha-forte@localhost:5432/patalimpa_db" < pata-limpa-crm.sql
```

> **Atenção:** Importe o dump apenas uma vez, na instalação inicial. Em atualizações futuras **não** reimporte o dump — isso apagaria os dados de produção.

Verifique se as tabelas foram criadas corretamente:
```bash
psql "postgres://patalimpa:troque-por-senha-forte@localhost:5432/patalimpa_db" -c "\dt public.*"
```

Você deve ver as tabelas: `appointments`, `clients`, `financial_entries`, `message_templates`, `packages`, `pets`, `services`, `sessions`, `settings`, `tenants`, `users`, `admin_sales`.

---

## 3. Fazer upload dos arquivos

Faça upload do conteúdo do zip para o servidor (exemplo com `scp`):

```bash
# No seu computador local:
scp pata-limpa-crm.zip usuario@seu-servidor.com:/opt/pata-limpa/
```

No servidor, descompacte:
```bash
cd /opt/pata-limpa
unzip pata-limpa-crm.zip
```

A estrutura final deve ser:
```
/opt/pata-limpa/
  package.json
  .env              ← você vai criar este arquivo
  dist/
    index.mjs       ← servidor Express (tudo bundlado)
    public/         ← frontend React compilado
    pino-*.mjs      ← workers de logging
```

---

## 4. Configurar as variáveis de ambiente

Crie o arquivo `.env` na mesma pasta do `package.json`:

```bash
cp .env.example .env
nano .env
```

Preencha todas as variáveis. As obrigatórias são:

```env
DATABASE_URL=postgres://patalimpa:troque-por-senha-forte@localhost:5432/patalimpa_db
NODE_ENV=production
PORT=3000
ADMIN_EMAIL=admin@suaempresa.com.br
ADMIN_PASSWORD=senha-forte-aqui
```

> **Segurança:** O arquivo `.env` nunca deve ser exposto publicamente nem versionado no Git.

---

## 5. Iniciar o servidor

### Opção A — Direto com Node.js (para teste inicial)

```bash
node --env-file=.env dist/index.mjs
```

Se tudo estiver correto, você verá no console:
```json
{"level":30,"msg":"Server listening","port":3000}
{"level":30,"msg":"Usuário admin já existe no banco de dados"}
```

Acesse `http://seu-servidor.com:3000` para confirmar que o sistema está no ar.

### Opção B — Com PM2 (recomendado para produção)

PM2 mantém o processo vivo após reinicializações do servidor.

```bash
# Instalar PM2 globalmente (uma vez)
npm install -g pm2

# Iniciar a aplicação
pm2 start dist/index.mjs --name pata-limpa --env production

# Carregar as variáveis do .env (alternativa)
# pm2 start dist/index.mjs --name pata-limpa -- --env-file .env

# Salvar para reiniciar automaticamente com o servidor
pm2 save
pm2 startup

# Verificar status
pm2 status
pm2 logs pata-limpa
```

---

## 6. Configurar Nginx como reverse proxy (HTTPS)

Se o servidor já tem Nginx instalado, configure um virtual host para redirecionar o tráfego HTTPS para a aplicação Node.js.

Crie `/etc/nginx/sites-available/pata-limpa`:

```nginx
server {
    listen 80;
    server_name seudominio.com.br www.seudominio.com.br;

    # Redirecionar HTTP para HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seudominio.com.br www.seudominio.com.br;

    # Certificado SSL (Let's Encrypt via Certbot)
    ssl_certificate     /etc/letsencrypt/live/seudominio.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seudominio.com.br/privkey.pem;

    # Proxy para o Node.js
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ative o site e recarregue o Nginx:
```bash
ln -s /etc/nginx/sites-available/pata-limpa /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

Para obter um certificado SSL gratuito com Let's Encrypt:
```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d seudominio.com.br -d www.seudominio.com.br
```

---

## 7. Verificar funcionamento

Após configurar o Nginx e HTTPS, teste os endpoints principais:

```bash
# Health check
curl https://seudominio.com.br/api/healthz
# Esperado: {"status":"ok"}

# Frontend React
curl -I https://seudominio.com.br/
# Esperado: HTTP/2 200, Content-Type: text/html

# SPA routing
curl -I https://seudominio.com.br/agendamentos
# Esperado: HTTP/2 200, Content-Type: text/html
```

---

## Atualizações futuras

Para atualizar o sistema com uma nova versão:

1. Gere o novo `pata-limpa-crm.zip` (ou receba do desenvolvedor)
2. Faça backup do `.env` antes de substituir os arquivos
3. No servidor, substitua apenas a pasta `dist/` — **não reimporte o SQL**
4. Reinicie o processo:
   ```bash
   pm2 restart pata-limpa
   ```

---

## Troubleshooting

### Servidor não inicia — erro de banco de dados
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
Verifique se o PostgreSQL está rodando e se a `DATABASE_URL` no `.env` está correta.

### Login não funciona — cookie não é enviado
Certifique-se que o Nginx está passando o header `X-Forwarded-Proto: https`. O servidor usa `trust proxy` e exige HTTPS em produção para o cookie `Secure`.

### Página em branco — SPA não carrega
Verifique se a pasta `dist/public/index.html` existe e se o `NODE_ENV=production` está definido no `.env`.

### `node: --env-file` não reconhecido
O flag `--env-file` requer Node.js 20.6+. Verifique com `node --version`. Alternativamente, instale o pacote `dotenv` e ajuste a inicialização, ou use PM2 com ecosystem file.

### Porta em uso
```
Error: listen EADDRINUSE :::3000
```
Mude o `PORT` no `.env` para outra porta livre (ex.: `3001`), ou encerre o processo que usa a porta 3000:
```bash
lsof -ti:3000 | xargs kill
```

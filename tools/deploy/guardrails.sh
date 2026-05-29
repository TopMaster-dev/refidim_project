#!/bin/bash
# Aplica guardrails de infra contra crash de longa duração.
# Executa NO SERVIDOR como root.
#
# 1. systemd MemoryMax — força restart se processo passa do limite (antes do kernel OOM-kill matar tudo)
# 2. systemd Restart=always com backoff exponencial
# 3. Daily auto-restart às 4h (defesa contra leaks lentos)
# 4. Watchdog cron — registra métricas a cada 1min em /var/log/refidim-watch.log
# 5. Healthcheck cron — restarta serviço se HTTP /login falha 3x consecutivas
set -e

echo "=== 1) systemd units com MemoryMax e restart resiliente ==="

cat > /etc/systemd/system/refidim-web.service <<'UNIT'
[Unit]
Description=Refidim Web (Next.js)
After=network.target postgresql.service redis-server.service
Requires=postgresql.service redis-server.service

[Service]
Type=simple
WorkingDirectory=/opt/refidim/apps/web
EnvironmentFile=/opt/refidim/.env
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=UV_THREADPOOL_SIZE=16
# --max-old-space-size em MB. 800MB cap pra V8 heap.
Environment=NODE_OPTIONS=--max-old-space-size=800
ExecStart=/usr/bin/pnpm start
Restart=always
RestartSec=5
# Mata processo se passar de 1GB de memória total (RSS). systemd reinicia.
MemoryMax=1G
# Restart até 5x em 60s; depois espera 30s
StartLimitIntervalSec=60
StartLimitBurst=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=refidim-web

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/systemd/system/refidim-worker.service <<'UNIT'
[Unit]
Description=Refidim Worker
After=network.target postgresql.service redis-server.service
Requires=postgresql.service redis-server.service

[Service]
Type=simple
WorkingDirectory=/opt/refidim/apps/worker
EnvironmentFile=/opt/refidim/.env
Environment=NODE_ENV=production
# Worker pode crescer mais (Baileys + IMAP sessions)
Environment=NODE_OPTIONS=--max-old-space-size=1024
ExecStart=/opt/refidim/apps/worker/node_modules/.bin/tsx src/index.ts
Restart=always
RestartSec=5
MemoryMax=1500M
StartLimitIntervalSec=60
StartLimitBurst=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=refidim-worker

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload

echo ""
echo "=== 2) Daily auto-restart 04:00 ==="

cat > /etc/systemd/system/refidim-restart.service <<'UNIT'
[Unit]
Description=Restart diário do Refidim (defesa em profundidade contra leaks lentos)

[Service]
Type=oneshot
ExecStart=/bin/systemctl restart refidim-web refidim-worker
UNIT

cat > /etc/systemd/system/refidim-restart.timer <<'UNIT'
[Unit]
Description=Trigger restart diário do Refidim às 04:00

[Timer]
OnCalendar=*-*-* 04:00:00
Persistent=true

[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now refidim-restart.timer

echo ""
echo "=== 3) Watchdog: métricas a cada minuto em /var/log/refidim-watch.log ==="

cat > /usr/local/bin/refidim-watchdog.sh <<'EOF'
#!/bin/bash
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
LOG=/var/log/refidim-watch.log
WEB_PID=$(systemctl show -p MainPID --value refidim-web 2>/dev/null)
WORKER_PID=$(systemctl show -p MainPID --value refidim-worker 2>/dev/null)
WEB_MEM=$(ps -p "$WEB_PID" -o rss= 2>/dev/null | awk '{print int($1/1024)"MB"}')
WORKER_MEM=$(ps -p "$WORKER_PID" -o rss= 2>/dev/null | awk '{print int($1/1024)"MB"}')
PG_CONN=$(sudo -u postgres psql -tA -c "SELECT count(*) FROM pg_stat_activity WHERE datname='refidim'" 2>/dev/null || echo "?")
LOAD=$(uptime | awk -F'load average:' '{print $2}' | xargs)
MEM_AVAIL=$(free -m | awk '/^Mem:/ {print $7"MB"}')
SWAP_USED=$(free -m | awk '/^Swap:/ {print $3"MB"}')
{
  echo "[$TS] web=$WEB_MEM worker=$WORKER_MEM pg_conn=$PG_CONN load=$LOAD mem_avail=$MEM_AVAIL swap_used=$SWAP_USED"
  # OOM detection
  if dmesg -T 2>/dev/null | tail -50 | grep -i "killed process" | tail -1 | grep -q "$(date '+%b %d %H:%M')"; then
    echo "[$TS] !!! OOM KILL DETECTED in last minute"
    dmesg -T 2>/dev/null | grep -i "killed process" | tail -1 >> $LOG
  fi
} >> $LOG
EOF
chmod +x /usr/local/bin/refidim-watchdog.sh
touch /var/log/refidim-watch.log
chmod 644 /var/log/refidim-watch.log

echo ""
echo "=== 4) Healthcheck cron — restarta se /login falha 3x ==="

cat > /usr/local/bin/refidim-healthcheck.sh <<'EOF'
#!/bin/bash
# Roda a cada 2min. Se /login falha 3x seguidas, restarta web. 3 fails = ~6min sem responder.
COUNTER_FILE=/var/tmp/refidim-health-fails
HTTP=$(curl -sS -m 8 -o /dev/null -w "%{http_code}" http://127.0.0.1/login 2>/dev/null || echo "000")
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
WATCH=/var/log/refidim-watch.log
if [ "$HTTP" = "200" ]; then
  echo 0 > $COUNTER_FILE
else
  FAILS=$(cat $COUNTER_FILE 2>/dev/null || echo 0)
  FAILS=$((FAILS + 1))
  echo $FAILS > $COUNTER_FILE
  echo "[$TS] health: HTTP $HTTP (fails=$FAILS)" >> $WATCH
  if [ "$FAILS" -ge 3 ]; then
    echo "[$TS] !!! AUTO-RESTART web (3 fails)" >> $WATCH
    systemctl restart refidim-web
    echo 0 > $COUNTER_FILE
  fi
fi
EOF
chmod +x /usr/local/bin/refidim-healthcheck.sh

# Cron entries
(crontab -l 2>/dev/null | grep -v refidim-watchdog | grep -v refidim-healthcheck; \
 echo "* * * * * /usr/local/bin/refidim-watchdog.sh"; \
 echo "*/2 * * * * /usr/local/bin/refidim-healthcheck.sh") | crontab -

echo ""
echo "=== 5) Restart services com nova config ==="
systemctl restart refidim-web refidim-worker
sleep 5
systemctl is-active refidim-web refidim-worker
echo ""
echo "=== Crontab atual ==="
crontab -l | tail -3
echo ""
echo "=== Timer ==="
systemctl list-timers refidim-restart.timer --no-pager 2>&1 | tail -3
echo ""
echo "✅ Guardrails instalados"

#!/bin/bash
# Roda no servidor logo após reboot pra capturar o que matou as services.
set +e

echo "================================================================"
echo "POST-CRASH DIAGNOSTIC — $(date -u)"
echo "================================================================"

echo ""
echo "=== 1) UPTIME (quanto tempo desde o boot) ==="
uptime
echo ""
echo "Boot history (últimos 5 boots):"
last reboot | head -5

echo ""
echo "=== 2) OOM KILLER (matou algum processo nosso?) ==="
echo "--- dmesg OOM ---"
dmesg -T 2>/dev/null | grep -iE "killed|out of memory|oom" | tail -20

echo ""
echo "--- journal OOM (boot anterior) ---"
journalctl -b -1 --no-pager 2>/dev/null | grep -iE "killed|out of memory|oom-killer" | tail -20

echo ""
echo "=== 3) CRASH DE SERVICES (boot anterior) ==="
for svc in refidim-web refidim-worker ssh nginx postgresql; do
  echo "--- $svc ---"
  journalctl -u $svc -b -1 --no-pager 2>/dev/null | grep -iE "fatal|error|killed|signal|core dump|abort|panic" | tail -5
done

echo ""
echo "=== 4) KERNEL ERRORS / HARDWARE ==="
dmesg -T 2>/dev/null | grep -iE "panic|fatal|hardware|i/o error|fail" | tail -15

echo ""
echo "=== 5) DISK ==="
df -h /
echo "--- inode usage ---"
df -i /

echo ""
echo "=== 6) MEMORY snapshot ==="
free -h
echo ""
echo "--- top 10 processos por RAM ---"
ps aux --sort=-rss | head -11

echo ""
echo "=== 7) PROCESSES suspeitos ==="
ps aux | grep -iE "node|nginx|postgres|redis|tsx" | grep -v grep | head -15

echo ""
echo "=== 8) NETWORK / sshd ==="
ss -tlnp 2>/dev/null | head -10
systemctl status ssh --no-pager 2>&1 | head -10

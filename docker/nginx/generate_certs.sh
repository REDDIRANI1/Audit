#!/usr/bin/env bash
# generate_certs.sh
# ---
# Generates a self-signed TLS certificate for local development.
# For production, replace these with Let's Encrypt certs via Certbot or
# copy your real certs to docker/nginx/certs/.
#
# Usage:
#   chmod +x generate_certs.sh
#   ./generate_certs.sh

set -e

CERT_DIR="$(dirname "$0")/certs"
mkdir -p "$CERT_DIR"

echo "[+] Generating self-signed certificate in $CERT_DIR ..."

openssl req -x509 -nodes \
  -newkey rsa:2048 \
  -keyout "$CERT_DIR/server.key" \
  -out    "$CERT_DIR/server.crt" \
  -days   365 \
  -subj   "/C=US/ST=Dev/L=Dev/O=AuditAI/CN=*.auditai.local" \
  -addext "subjectAltName=DNS:auditai.local,DNS:api.auditai.local,DNS:app.auditai.local,DNS:localhost"

echo "[+] Certificate generated:"
echo "    Key : $CERT_DIR/server.key"
echo "    Cert: $CERT_DIR/server.crt"
echo ""
echo "Add to /etc/hosts for local dev:"
echo "    127.0.0.1  api.auditai.local app.auditai.local"
echo ""
echo "For production: replace these files with Certbot / Let's Encrypt certs."

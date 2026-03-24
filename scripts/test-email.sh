#!/usr/bin/env bash
# scripts/test-email.sh
# Tests the ImprovMX SMTP connection by sending a test email via the Directus container.
#
# Usage:
#   ./scripts/test-email.sh                         # sends to EMAIL_FROM
#   ./scripts/test-email.sh you@example.com         # sends to a specific address

set -euo pipefail

ENV_FILE="$(dirname "$0")/../.docker/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found." >&2
  exit 1
fi

# Load email vars from .docker/.env (strip quotes)
eval "$(grep -E '^EMAIL_SMTP_' "$ENV_FILE" | sed 's/[[:space:]]*#.*//' | sed "s/['\"]//g")"
eval "$(grep -E '^EMAIL_FROM=' "$ENV_FILE" | sed 's/[[:space:]]*#.*//' | sed "s/['\"]//g")"

TO="${1:-$EMAIL_FROM}"
CONTAINER="aazucena-wedding-cms"
NODEMAILER="/directus/node_modules/.pnpm/nodemailer@7.0.11/node_modules/nodemailer"

echo "SMTP host : $EMAIL_SMTP_HOST:$EMAIL_SMTP_PORT"
echo "Auth user : $EMAIL_SMTP_USER"
echo "From      : $EMAIL_FROM"
echo "To        : $TO"
echo ""

docker exec "$CONTAINER" node -e "
const nodemailer = require('$NODEMAILER');
const transport = nodemailer.createTransport({
  host:   '$EMAIL_SMTP_HOST',
  port:    $EMAIL_SMTP_PORT,
  secure:  false,
  auth: { user: '$EMAIL_SMTP_USER', pass: '$EMAIL_SMTP_PASSWORD' }
});

transport.verify()
  .then(() => {
    console.log('✓ SMTP connection verified');
    return transport.sendMail({
      from:    '$EMAIL_FROM',
      to:      '$TO',
      subject: 'Directus SMTP Test — wedding.aazucena.com',
      text:    'This is a test email confirming ImprovMX SMTP is working correctly for the wedding planner.',
      html:    '<p>This is a test email confirming <strong>ImprovMX SMTP</strong> is working correctly for the wedding planner.</p>'
    });
  })
  .then(info => console.log('✓ Email sent:', info.messageId))
  .catch(err => { console.error('✗ Error:', err.message); process.exit(1); });
"

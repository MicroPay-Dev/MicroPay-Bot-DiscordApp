const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..', '..');

/**
 * Base directory for all persistent runtime data: the SQLite DB file and
 * everything under uploads/ (vip files, transcripts, backups).
 *
 * On Railway, attaching a Volume to this service automatically sets
 * RAILWAY_VOLUME_MOUNT_PATH (e.g. "/data") — when present, we store
 * everything there so it survives redeploys. Locally (or on Railway
 * without a Volume attached), we fall back to the project root, same
 * as before — nothing changes for local development.
 *
 * See KNOWN_ISSUES.md: a Volume must still be created/attached via the
 * Railway dashboard or CLI; that step cannot be done from code.
 */
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || PROJECT_ROOT;

module.exports = { DATA_DIR, PROJECT_ROOT };

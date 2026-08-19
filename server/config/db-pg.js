const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

function translateQuery(sql) {
  let translated = sql;

  // Convert MySQL SUM(col = 'val') to PG-compatible
  translated = translated.replace(
    /SUM\((\w+)\s*=\s*'([^']+)'\)/g,
    "SUM(CASE WHEN $1 = '$2' THEN 1 ELSE 0 END)"
  );

  // Convert ON DUPLICATE KEY UPDATE col = ? → ON CONFLICT DO UPDATE SET col = $N
  // This is a rough translation; works for the patterns used in this codebase
  translated = translated.replace(
    /INSERT INTO (\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)\s*ON DUPLICATE KEY UPDATE\s*(.+)/gi,
    (_match, table, cols, vals, updates) => {
      const colList = cols.split(',').map(c => c.trim().replace(/`/g, ''));
      const firstCol = colList[0];
      // Rewrite as INSERT ... ON CONFLICT (first_col) DO UPDATE SET ...
      return `INSERT INTO ${table} (${cols}) VALUES (${vals}) ON CONFLICT (${firstCol}) DO UPDATE SET ${updates.replace(/(\w+)\s*=\s*\?/g, (_, col) => `${col} = EXCLUDED.${col}`)}`;
    }
  );

  // Convert datetime('now') to PG equivalent
  translated = translated.replace(/datetime\('now'\)/gi, "(NOW() AT TIME ZONE 'utc')");

  // Remove backticks
  translated = translated.replace(/`/g, '');

  return translated;
}

function convertPlaceholders(sql, params) {
  let idx = 0;
  const newParams = [];
  // Expand array params for IN clauses: $N = [arr] → $1 = a, $2 = b, $3 = c
  const converted = sql.replace(/\?/g, () => {
    idx++;
    const val = params[idx - 1];
    if (Array.isArray(val)) {
      const placeholders = val.map(() => `$${++newParams.length}`).join(', ');
      newParams.push(...val);
      return placeholders;
    }
    newParams.push(val);
    return `$${newParams.length}`;
  });
  return { sql: converted, params: newParams };
}

function rewritePGError(err) {
  // Map PostgreSQL unique violation to ER_DUP_ENTRY so existing route code works
  if (err.code === '23505') {
    err.code = 'ER_DUP_ENTRY';
  }
  return err;
}

function query(sql, params = []) {
  const db = getPool();
  let translated = translateQuery(sql);
  const upperTrimmed = translated.trim().toUpperCase();

  // Handle CREATE, USE, etc.
  if (upperTrimmed.startsWith('CREATE') || upperTrimmed.startsWith('USE') || upperTrimmed.startsWith('ALTER')) {
    // Split multi-statement SQL
    const statements = translated.split(';').filter(s => s.trim());
    return statements.reduce((p, stmt) => {
      return p.then(() => db.query(stmt.trim()));
    }, Promise.resolve()).then(() => []);
  }

  const { sql: pgSql, params: pgParams } = convertPlaceholders(translated, params);

  if (upperTrimmed.startsWith('SELECT') || upperTrimmed.startsWith('WITH')) {
    return db.query(pgSql, pgParams).then(result => [result.rows]).catch(err => Promise.reject(rewritePGError(err)));
  }

  if (upperTrimmed.startsWith('INSERT')) {
    const hasReturning = upperTrimmed.includes('RETURNING');
    const returnClause = hasReturning ? '' : ' RETURNING id';
    return db.query(pgSql + returnClause, pgParams).then(result => {
      return [{ insertId: result.rows[0] ? result.rows[0].id : null, affectedRows: result.rowCount }];
    }).catch(err => Promise.reject(rewritePGError(err)));
  }

  if (upperTrimmed.startsWith('UPDATE') || upperTrimmed.startsWith('DELETE')) {
    return db.query(pgSql, pgParams).then(result => {
      return [{ affectedRows: result.rowCount }];
    }).catch(err => Promise.reject(rewritePGError(err)));
  }

  return db.query(pgSql, pgParams).then(result => [result.rows]).catch(err => Promise.reject(rewritePGError(err)));
}

function getConnection() {
  const db = getPool();
  return db.connect().then(client => ({
    query: (...args) => {
      if (args.length === 0) {
        // Transaction commands: BEGIN, COMMIT, ROLLBACK
        return client.query(args[0]);
      }
      const [sql, params] = args;
      const translated = translateQuery(sql);
      const { sql: pgSql, params: pgParams } = convertPlaceholders(translated, params || []);
      const upperTrimmed = translated.trim().toUpperCase();

      if (upperTrimmed.startsWith('INSERT')) {
        return client.query(pgSql + ' RETURNING id', pgParams).then(result => {
          return [{ insertId: result.rows[0] ? result.rows[0].id : null, affectedRows: result.rowCount }];
        });
      }
      return client.query(pgSql, pgParams).then(result => {
        if (upperTrimmed.startsWith('SELECT')) return [result.rows];
        return [{ affectedRows: result.rowCount }];
      });
    },
    beginTransaction: () => client.query('BEGIN'),
    commit: () => client.query('COMMIT'),
    rollback: () => client.query('ROLLBACK'),
    release: () => client.release(),
    changeUser: () => Promise.resolve(),
  }));
}

module.exports = { query, getConnection, getPool };

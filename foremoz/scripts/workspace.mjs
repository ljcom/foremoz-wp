import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const npmCmd = process.execPath;
const npmCliFallback = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
const npmCliPath = process.env.npm_execpath || (existsSync(npmCliFallback) ? npmCliFallback : null);

if (!npmCliPath) {
  throw new Error('Unable to locate npm CLI. Ensure npm is installed and available in this environment.');
}

const APPS = {
  fitness: {
    dbEnv: 'DB_FITNESS_URL',
    dbDefault: 'postgresql://postgres:ljcom2x@localhost:15432/eventdb_foremoz',
    eventdbPortEnv: 'EVENTDB_FOREMOZ_PORT',
    eventdbPortDefault: '3020',
    apiPortEnv: 'API_FITNESS_PORT',
    apiPortDefault: '3310',
    apiPrefix: './foremoz/apps/api',
    vitePrefix: './foremoz/apps/vite'
  },
  passport: {
    dbEnv: 'DB_PASSPORT_URL',
    dbDefault: 'postgresql://postgres:ljcom2x@localhost:15432/eventdb_passport',
    eventdbPortEnv: 'EVENTDB_PASSPORT_PORT',
    eventdbPortDefault: '3022',
    apiPortEnv: 'API_PASSPORT_PORT',
    apiPortDefault: '3600',
    apiPrefix: './passport/apps/api',
    vitePrefix: null
  }
};

function runNpm(args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(npmCmd, [npmCliPath, ...args], {
      stdio: 'inherit',
      env
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) return reject(new Error(`command terminated by signal ${signal}`));
      if (code !== 0) return reject(new Error(`command failed (${npmCmd} ${args.join(' ')}) with code ${code}`));
      resolve();
    });
  });
}

function spawnNpm(args, env = process.env) {
  return spawn(npmCmd, [npmCliPath, ...args], {
    stdio: 'inherit',
    env
  });
}

function appRuntime(appName) {
  const app = APPS[appName];
  if (!app) throw new Error(`unknown app: ${appName}`);

  return {
    ...app,
    dbUrl: process.env[app.dbEnv] || app.dbDefault,
    eventdbPort: process.env[app.eventdbPortEnv] || app.eventdbPortDefault,
    apiPort: process.env[app.apiPortEnv] || app.apiPortDefault
  };
}

async function setupApp(appName) {
  const app = appRuntime(appName);
  const env = { ...process.env, DATABASE_URL: app.dbUrl };
  console.log(`[setup:${appName}] DATABASE_URL=${app.dbUrl}`);
  await runNpm(['--prefix', './eventdb/mvp-node', 'run', 'db:schema'], env);
  await runNpm(['--prefix', app.apiPrefix, 'run', 'db:read-model'], env);
}

function devApp(appName, options = {}) {
  const { includeEventdb = true } = options;
  const app = appRuntime(appName);
  const baseEnv = { ...process.env, DATABASE_URL: app.dbUrl };
  console.log(
    `[dev:${appName}] DATABASE_URL=${app.dbUrl} EVENTDB_PORT=${app.eventdbPort} API_PORT=${app.apiPort}`
  );

  const children = [];
  if (includeEventdb) {
    children.push(
      spawnNpm(['--prefix', './eventdb/mvp-node', 'run', 'dev'], {
        ...baseEnv,
        PORT: app.eventdbPort
      })
    );
  }
  children.push(spawnNpm(['--prefix', app.apiPrefix, 'run', 'dev'], { ...baseEnv, PORT: app.apiPort }));
  if (app.vitePrefix) {
    const passportRuntime = appRuntime('passport');
    children.push(
      spawnNpm(
        ['--prefix', app.vitePrefix, 'run', 'dev'],
        {
          ...process.env,
          VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || `http://localhost:${app.apiPort}`,
          VITE_PASSPORT_API_BASE_URL:
            process.env.VITE_PASSPORT_API_BASE_URL || `http://localhost:${passportRuntime.apiPort}`
        }
      )
    );
  }
  return children;
}

async function main() {
  const action = process.argv[2];
  const target = process.argv[3];

  if (!action || !target) {
    console.error('Usage: node ./scripts/workspace.mjs <setup|dev> <fitness|passport|all>');
    process.exit(1);
  }

  const names = target === 'all' ? Object.keys(APPS) : [target];
  for (const name of names) {
    if (!APPS[name]) {
      console.error(`Unknown target: ${name}`);
      process.exit(1);
    }
  }

  if (action === 'setup') {
    for (const name of names) {
      await setupApp(name);
    }
    return;
  }

  if (action === 'dev') {
    const children = [];
    let stopping = false;

    const stopAll = () => {
      if (stopping) return;
      stopping = true;
      for (const child of children) {
        if (!child.killed) child.kill('SIGTERM');
      }
      setTimeout(() => {
        for (const child of children) {
          if (!child.killed) child.kill('SIGKILL');
        }
      }, 1500);
    };

    process.on('SIGINT', stopAll);
    process.on('SIGTERM', stopAll);

    for (let i = 0; i < names.length; i += 1) {
      const name = names[i];
      const includeEventdb = i === 0;
      children.push(...devApp(name, { includeEventdb }));
    }

    await Promise.race(
      children.map(
        (child) =>
          new Promise((resolve, reject) => {
            child.on('error', reject);
            child.on('exit', (code) => {
              if (stopping) return resolve();
              if (code === 0) return resolve();
              reject(new Error(`child exited with code ${code}`));
            });
          })
      )
    ).catch((err) => {
      console.error(err.message || String(err));
      process.exitCode = 1;
    });

    stopAll();
    return;
  }

  console.error(`Unknown action: ${action}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err.message || String(err));
  process.exit(1);
});

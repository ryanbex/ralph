#!/usr/bin/env node
/**
 * Ralph REST API Server
 * Provides remote access to Ralph workstream management
 *
 * Endpoints:
 * GET  /projects                           - List all projects
 * GET  /projects/:name                     - Get project details
 * GET  /projects/:name/workstreams         - List workstreams
 * GET  /projects/:name/workstreams/:ws     - Get workstream status
 * POST /projects/:name/workstreams/:ws/stop - Stop a workstream
 * POST /projects/:name/workstreams/:ws/answer - Answer a question
 * GET  /projects/:name/workstreams/:ws/logs - Get log tail
 */

import express from 'express';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { execSync, spawn } from 'child_process';
import { join, basename } from 'path';
import { homedir } from 'os';

const app = express();
app.use(express.json());

// Configuration
const RALPH_HOME = process.env.RALPH_HOME || join(homedir(), '.ralph');
const CONFIG_FILE = join(RALPH_HOME, 'config.yaml');
const PROJECTS_DIR = join(RALPH_HOME, 'projects');
const STATE_DIR = join(RALPH_HOME, 'state');
const LOGS_DIR = join(RALPH_HOME, 'logs');

// Read port and API key from config
function getConfig() {
  try {
    const config = readFileSync(CONFIG_FILE, 'utf-8');
    const portMatch = config.match(/port:\s*(\d+)/);
    // Match api_key only if not commented out (no # before it on the line)
    const keyMatch = config.match(/^\s*api_key:\s*["']?([a-f0-9]+)["']?\s*$/m);
    return {
      port: portMatch ? parseInt(portMatch[1]) : 3847,
      apiKey: keyMatch ? keyMatch[1] : null
    };
  } catch {
    return { port: 3847, apiKey: null };
  }
}

// API Key middleware
function authenticate(req, res, next) {
  const config = getConfig();
  if (!config.apiKey) {
    // No API key configured, allow access
    return next();
  }

  const providedKey = req.headers['x-api-key'] || req.query.key;
  if (providedKey === config.apiKey) {
    return next();
  }

  res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing API key' });
}

// Apply auth to all routes
app.use(authenticate);

// Helper: Parse simple YAML value
function yamlGet(file, key) {
  try {
    const content = readFileSync(file, 'utf-8');
    const match = content.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
    return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
  } catch {
    return null;
  }
}

// Helper: Get all projects
function getProjects() {
  if (!existsSync(PROJECTS_DIR)) return [];

  return readdirSync(PROJECTS_DIR)
    .filter(f => f.endsWith('.yaml'))
    .map(f => {
      const path = join(PROJECTS_DIR, f);
      const name = basename(f, '.yaml');
      return {
        name,
        type: yamlGet(path, 'type') || 'single-repo',
        root: yamlGet(path, 'root'),
        baseBranch: yamlGet(path, 'base_branch')
      };
    });
}

// Helper: Get workstreams for a project
function getWorkstreams(project) {
  const projectStateDir = join(STATE_DIR, project);
  if (!existsSync(projectStateDir)) return [];

  return readdirSync(projectStateDir)
    .filter(f => statSync(join(projectStateDir, f)).isDirectory())
    .map(ws => getWorkstreamStatus(project, ws));
}

// Helper: Get workstream status
function getWorkstreamStatus(project, workstream) {
  const wsStateDir = join(STATE_DIR, project, workstream);
  const wsLogDir = join(LOGS_DIR, project, workstream);

  const status = existsSync(join(wsStateDir, 'status'))
    ? readFileSync(join(wsStateDir, 'status'), 'utf-8').trim()
    : 'UNKNOWN';

  const iteration = existsSync(join(wsStateDir, 'iteration'))
    ? parseInt(readFileSync(join(wsStateDir, 'iteration'), 'utf-8').trim())
    : 0;

  const question = existsSync(join(wsStateDir, 'question'))
    ? readFileSync(join(wsStateDir, 'question'), 'utf-8').trim()
    : null;

  // Check if tmux session exists
  let tmuxRunning = false;
  try {
    execSync(`tmux has-session -t ralph-${project}-${workstream} 2>/dev/null`);
    tmuxRunning = true;
  } catch {}

  return {
    name: workstream,
    status,
    iteration,
    question,
    tmuxRunning
  };
}

// Helper: Get log tail
function getLogTail(project, workstream, lines = 50) {
  const logDir = join(LOGS_DIR, project, workstream);
  if (!existsSync(logDir)) return null;

  const logFiles = readdirSync(logDir)
    .filter(f => f.endsWith('.log'))
    .sort()
    .reverse();

  if (logFiles.length === 0) return null;

  const latestLog = join(logDir, logFiles[0]);
  try {
    const content = readFileSync(latestLog, 'utf-8');
    const logLines = content.split('\n');
    return {
      file: logFiles[0],
      lines: logLines.slice(-lines).join('\n')
    };
  } catch {
    return null;
  }
}

// Routes

// List all projects
app.get('/projects', (req, res) => {
  const projects = getProjects();
  res.json({ projects });
});

// Get project details
app.get('/projects/:name', (req, res) => {
  const { name } = req.params;
  const projectFile = join(PROJECTS_DIR, `${name}.yaml`);

  if (!existsSync(projectFile)) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const project = {
    name,
    type: yamlGet(projectFile, 'type') || 'single-repo',
    root: yamlGet(projectFile, 'root'),
    baseBranch: yamlGet(projectFile, 'base_branch')
  };

  res.json(project);
});

// List workstreams for a project
app.get('/projects/:name/workstreams', (req, res) => {
  const { name } = req.params;
  const projectFile = join(PROJECTS_DIR, `${name}.yaml`);

  if (!existsSync(projectFile)) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const workstreams = getWorkstreams(name);
  res.json({ workstreams });
});

// Get workstream status
app.get('/projects/:name/workstreams/:ws', (req, res) => {
  const { name, ws } = req.params;
  const wsStateDir = join(STATE_DIR, name, ws);

  if (!existsSync(wsStateDir)) {
    return res.status(404).json({ error: 'Workstream not found' });
  }

  const status = getWorkstreamStatus(name, ws);
  res.json(status);
});

// Stop a workstream
app.post('/projects/:name/workstreams/:ws/stop', (req, res) => {
  const { name, ws } = req.params;
  const wsStateDir = join(STATE_DIR, name, ws);

  if (!existsSync(wsStateDir)) {
    return res.status(404).json({ error: 'Workstream not found' });
  }

  try {
    // Send Ctrl-C to tmux session
    execSync(`tmux send-keys -t ralph-${name}-${ws} C-c`);
    writeFileSync(join(wsStateDir, 'status'), 'STOPPING');
    res.json({ success: true, message: 'Stop signal sent' });
  } catch (error) {
    // Session might not exist
    writeFileSync(join(wsStateDir, 'stop'), '');
    res.json({ success: true, message: 'Stop file created' });
  }
});

// Answer a question
app.post('/projects/:name/workstreams/:ws/answer', (req, res) => {
  const { name, ws } = req.params;
  const { answer } = req.body;

  if (!answer) {
    return res.status(400).json({ error: 'Answer required' });
  }

  const wsStateDir = join(STATE_DIR, name, ws);
  const questionFile = join(wsStateDir, 'question');
  const answerFile = join(wsStateDir, 'answer');

  if (!existsSync(questionFile)) {
    return res.status(404).json({ error: 'No pending question' });
  }

  writeFileSync(answerFile, answer);
  res.json({ success: true, message: 'Answer submitted' });
});

// Get log tail
app.get('/projects/:name/workstreams/:ws/logs', (req, res) => {
  const { name, ws } = req.params;
  const lines = parseInt(req.query.lines) || 50;

  const log = getLogTail(name, ws, lines);
  if (!log) {
    return res.status(404).json({ error: 'No logs found' });
  }

  res.json(log);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// Start server
const config = getConfig();
const PORT = process.env.PORT || config.port;

app.listen(PORT, () => {
  console.log(`Ralph API server listening on port ${PORT}`);
  console.log(`RALPH_HOME: ${RALPH_HOME}`);
  if (!config.apiKey) {
    console.log('Warning: No API key configured. Run "ralph server key" to generate one.');
  }
});

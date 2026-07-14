import { spawn } from 'child_process';
import fs from 'fs';
import { localBinPath, isPackageInstalled, DESIGN_MD_PACKAGE } from './design-md-helpers';

export interface CliResult {
  ok: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  command: string;
  error?: string;
}

/** Run the local design.md binary. Falls back to `npx --no-install` if the binary symlink is missing. */
export function runDesignMdCli(args: string[], stdinData?: string): Promise<CliResult> {
  return new Promise((resolve) => {
    const { installed } = isPackageInstalled();
    if (!installed) {
      resolve({
        ok: false,
        exitCode: null,
        stdout: '',
        stderr: '',
        command: `design.md ${args.join(' ')}`,
        error: `${DESIGN_MD_PACKAGE} is not installed. Click "Set up design system" first.`,
      });
      return;
    }

    const isWin = process.platform === 'win32';
    const binPath = localBinPath();
    // On Windows the extensionless file in `.bin` is a POSIX shell script;
    // spawning it directly throws EFTYPE. Prefer the native `.exe` shim (runs
    // directly, no shell), then fall back to the `.cmd` shim (needs a shell).
    const winExe = `${binPath}.exe`;
    const winCmd = `${binPath}.cmd`;

    let cmd: string;
    let cmdArgs: string[];
    // Node ≥18.20/20.12 requires shell:true to run .cmd/.bat shims (CVE-2024-27980).
    let useShell = false;
    if (isWin && fs.existsSync(winExe)) {
      cmd = winExe;
      cmdArgs = args;
    } else if (isWin && fs.existsSync(winCmd)) {
      cmd = winCmd;
      cmdArgs = args;
      useShell = true;
    } else if (fs.existsSync(binPath)) {
      cmd = binPath;
      cmdArgs = args;
    } else {
      cmd = 'npx';
      cmdArgs = ['--no-install', 'design.md', ...args];
      useShell = isWin;
    }

    // With shell:true on Windows, cmd.exe splits on spaces and does no quoting
    // of its own, so quote the executable path and any args that contain spaces
    // (temp-file paths under the user profile routinely do).
    const quote = (s: string) => (/[\s]/.test(s) ? `"${s}"` : s);
    const spawnCmd = useShell ? quote(cmd) : cmd;
    const spawnArgs = useShell ? cmdArgs.map(quote) : cmdArgs;

    const child = spawn(spawnCmd, spawnArgs, {
      cwd: process.cwd(),
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
      stdio: [stdinData ? 'pipe' : 'ignore', 'pipe', 'pipe'],
      shell: useShell,
    });

    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (b: Buffer) => { stdout += b.toString('utf8'); });
    child.stderr?.on('data', (b: Buffer) => { stderr += b.toString('utf8'); });

    if (stdinData && child.stdin) {
      child.stdin.write(stdinData);
      child.stdin.end();
    }

    child.on('error', (err) => {
      resolve({
        ok: false,
        exitCode: null,
        stdout,
        stderr,
        command: `${cmd} ${cmdArgs.join(' ')}`,
        error: err.message,
      });
    });

    child.on('close', (code) => {
      resolve({
        ok: code === 0,
        exitCode: code,
        stdout,
        stderr,
        command: `${cmd} ${cmdArgs.join(' ')}`,
      });
    });
  });
}

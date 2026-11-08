"""Run only this task's empty simulator app; never touches real LINE data."""
from pathlib import Path
import json
import os
import plistlib
import shutil
import subprocess
import time
import zipfile

out = Path('ios-diagnostics')
out.mkdir(exist_ok=True)

def run(*args, timeout=180):
    print('Running:', ' '.join(map(str, args)), flush=True)
    return subprocess.check_output(list(map(str, args)), text=True, timeout=timeout)

archive = next(Path('simulator-artifact').rglob('laab-simulator.zip'))
with zipfile.ZipFile(archive) as z:
    z.extractall('simulator-app')
app = next(Path('simulator-app').rglob('*.app')).resolve()
info = plistlib.loads((app / 'Info.plist').read_bytes())
identifier = info['CFBundleIdentifier']
# Python's ZIP extraction does not restore executable permission bits.
(app / info['CFBundleExecutable']).chmod(0o755)
devices = json.loads(run('xcrun', 'simctl', 'list', 'devices', 'available', '--json'))['devices']
phones = [d for group in devices.values() for d in group if d['name'].startswith('iPhone')]
phone = next((d for d in phones if d['state'] == 'Booted'), phones[0])
udid = phone['udid']
if phone['state'] != 'Booted':
    run('xcrun', 'simctl', 'boot', udid)
run('xcrun', 'simctl', 'bootstatus', udid, '-b')
run('xcrun', 'simctl', 'install', udid, app)
env = dict(os.environ, SIMCTL_CHILD_RUST_BACKTRACE='1', SIMCTL_CHILD_RUST_LOG='laab_lib=debug,line_rs=warn')
with (out / 'console.log').open('w') as log:
    process = subprocess.Popen(['xcrun', 'simctl', 'launch', '--console', '--terminate-running-process', udid, identifier], stdout=log, stderr=subprocess.STDOUT, env=env)
    # Allow slow cold starts on shared Mac runners; retain the app's stderr.
    time.sleep(100)
    result = process.poll()
    (out / 'launch-status.txt').write_text(f'Console process exit status: {result}\n')
    try:
        run('xcrun', 'simctl', 'io', udid, 'screenshot', (out / 'native-iphone.png').resolve(), timeout=60)
        data = Path(run('xcrun', 'simctl', 'get_app_container', udid, identifier, 'data').strip())
        for p in data.rglob('laab*.log'):
            shutil.copyfile(p, out / p.name)
        for p in (Path.home() / 'Library/Logs/DiagnosticReports').glob('LAAB*'):
            if p.is_file():
                shutil.copyfile(p, out / p.name)
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
    if result is not None:
        print((out / 'console.log').read_text(), flush=True)
        raise SystemExit('Native app console exited; inspect diagnostic artifact')

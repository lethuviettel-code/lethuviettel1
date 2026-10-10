"""Only publish storefront files, never tests, legacy backend or admin source."""
from pathlib import Path
import shutil
import subprocess
root=Path(__file__).resolve().parents[1]
out=root/'dist'
if out.exists(): shutil.rmtree(out)
out.mkdir()
for name in ['index.html','admin.html','app.js','admin.js','site-config.js','sheets-client.js','styles.css','favicon.svg']:
    shutil.copy2(root/name,out/name)
subprocess.run(['node', str(root/'scripts/prerender.cjs'), str(out/'index.html')], check=True)
shutil.copytree(root/'assets',out/'assets')
if (root/'CNAME').is_file():
    shutil.copy2(root/'CNAME',out/'CNAME')
(out/'.nojekyll').touch()
print('Static storefront built in dist/')

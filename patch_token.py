import os
import re

target_dir = '/home/adrian-the-techie/Projects/Connvotech/hospitality-pos/frontend/app/(dashboard)/inventory'

for root, _, files in os.walk(target_dir):
    for filename in files:
        if filename.endswith('.tsx') or filename.endswith('.ts'):
            path = os.path.join(root, filename)
            with open(path, 'r') as f:
                content = f.read()
            
            # The issue: `const { token } = useAuthStore()` is wrong.
            # We must set `const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : ''`
            # Or just replace `Bearer ${token}` with `Bearer ${localStorage.getItem('access_token')}` directly.
            
            if "Bearer ${token}" in content:
                new_content = content.replace("Bearer ${token}", "Bearer ${localStorage.getItem('access_token')}")
                # For safety, remove `const { token } = useAuthStore()` if it's there
                new_content = re.sub(r'const\s*{\s*token\s*,?\s*([^}]*)\}\s*=\s*useAuthStore\(\)', r'const { \1 } = useAuthStore()', new_content)
                new_content = new_content.replace('const {  } = useAuthStore()', '')
                
                with open(path, 'w') as f:
                    f.write(new_content)
                print(f"Patched token fetch in {path}")

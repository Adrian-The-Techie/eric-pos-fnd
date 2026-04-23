import os

target_dir = '/home/adrian-the-techie/Projects/Connvotech/hospitality-pos/frontend/app/(dashboard)/inventory'

for root, _, files in os.walk(target_dir):
    for filename in files:
        if filename.endswith('.tsx') or filename.endswith('.ts'):
            path = os.path.join(root, filename)
            with open(path, 'r') as f:
                content = f.read()
            if 'http://127.0.0.1:8000/api/' in content:
                new_content = content.replace('http://127.0.0.1:8000/api/', 'http://127.0.0.1:8000/api/v1/')
                # Note: avoid double /v1/ if somehow already there
                new_content = new_content.replace('/api/v1/v1/', '/api/v1/')
                with open(path, 'w') as f:
                    f.write(new_content)
                print(f"Patched {path}")

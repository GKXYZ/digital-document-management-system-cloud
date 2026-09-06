import os
import re

directory = 'c:/Users/teaml/Pictures/Digital Document Management System on Cloud/server/controllers'
files = [f for f in os.listdir(directory) if f.endswith('.js')]

for file in files:
    filepath = os.path.join(directory, file)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove the require statement
    content = re.sub(r'const\s+logActivity\s*=\s*require\([\'\"]\.\.\/utils\/logger[\'\"]\);\n?', '', content)
    
    # Remove the logActivity function calls
    content = re.sub(r'logActivity\s*\([\s\S]*?\)\s*;', '', content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print('Cleaned up logActivity calls from controllers.')

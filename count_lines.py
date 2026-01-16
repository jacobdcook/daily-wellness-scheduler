#!/usr/bin/env python3
"""Count lines of code in the project"""
import os
from pathlib import Path

def count_lines(file_path):
    """Count lines in a file"""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return len(f.readlines())
    except:
        return 0

def should_exclude(path_str):
    """Check if file should be excluded"""
    exclude_patterns = [
        'node_modules',
        '.next',
        'dist',
        'build',
        '__pycache__',
        '.git',
        'package-lock.json',
        'yarn.lock',
        '.d.ts',
        '.min.js',
        'coverage',
        '.env',
    ]
    return any(pattern in path_str for pattern in exclude_patterns)

def main():
    backend_total = 0
    frontend_total = 0
    other_total = 0
    
    backend_files = []
    frontend_files = []
    other_files = []
    
    # Count backend Python files
    backend_dir = Path('backend')
    if backend_dir.exists():
        for py_file in backend_dir.rglob('*.py'):
            if not should_exclude(str(py_file)):
                lines = count_lines(py_file)
                backend_total += lines
                backend_files.append((str(py_file), lines))
    
    # Count frontend TypeScript/React files
    frontend_dir = Path('frontend')
    if frontend_dir.exists():
        for ext in ['*.ts', '*.tsx', '*.js', '*.jsx']:
            for js_file in frontend_dir.rglob(ext):
                if not should_exclude(str(js_file)):
                    lines = count_lines(js_file)
                    frontend_total += lines
                    frontend_files.append((str(js_file), lines))
    
    # Count root level Python files (like start_app.py, count_lines.py itself)
    root_dir = Path('.')
    for py_file in root_dir.glob('*.py'):
        if not should_exclude(str(py_file)) and py_file.name != 'count_lines.py':
            lines = count_lines(py_file)
            other_total += lines
            other_files.append((str(py_file), lines))
    
    # Sort files by line count
    backend_files.sort(key=lambda x: x[1], reverse=True)
    frontend_files.sort(key=lambda x: x[1], reverse=True)
    
    print("=" * 80)
    print("LINES OF CODE COUNT")
    print("=" * 80)
    print(f"\n📁 BACKEND (Python): {backend_total:,} lines")
    print("-" * 80)
    for file, lines in backend_files[:10]:  # Top 10
        print(f"  {file}: {lines:,} lines")
    if len(backend_files) > 10:
        print(f"  ... and {len(backend_files) - 10} more files")
    
    print(f"\n⚛️  FRONTEND (TypeScript/React): {frontend_total:,} lines")
    print("-" * 80)
    for file, lines in frontend_files[:10]:  # Top 10
        print(f"  {file}: {lines:,} lines")
    if len(frontend_files) > 10:
        print(f"  ... and {len(frontend_files) - 10} more files")
    
    if other_files:
        print(f"\n📄 ROOT FILES: {other_total:,} lines")
        for file, lines in other_files:
            print(f"  {file}: {lines:,} lines")
    
    total = backend_total + frontend_total + other_total
    print("\n" + "=" * 80)
    print(f"🎯 TOTAL: {total:,} lines of code")
    print("=" * 80)
    print(f"\nBreakdown:")
    print(f"  Backend: {backend_total:,} lines ({backend_total/total*100:.1f}%)")
    print(f"  Frontend: {frontend_total:,} lines ({frontend_total/total*100:.1f}%)")
    if other_total > 0:
        print(f"  Other: {other_total:,} lines ({other_total/total*100:.1f}%)")
    print(f"\nTotal files: {len(backend_files) + len(frontend_files) + len(other_files)}")

if __name__ == '__main__':
    main()


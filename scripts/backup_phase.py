import shutil
import os
import datetime
import sys

def create_backup(phase_name):
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = os.path.join("backups", f"{phase_name}_{timestamp}")
    
    # Define what to backup
    dirs_to_backup = ["frontend", "backend"]
    files_to_backup = ["requirements.txt", "README.md"]
    
    try:
        if not os.path.exists("backups"):
            os.makedirs("backups")
            
        os.makedirs(backup_dir)
        
        for d in dirs_to_backup:
            if os.path.exists(d):
                # Ignore node_modules and __pycache__ and .next
                shutil.copytree(d, os.path.join(backup_dir, d), 
                                ignore=shutil.ignore_patterns("node_modules", "__pycache__", ".next", ".git", ".venv", "venv"))
                print(f"Backed up {d}")
        
        for f in files_to_backup:
            if os.path.exists(f):
                shutil.copy2(f, backup_dir)
                print(f"Backed up {f}")
                
        print(f"Backup created successfully at {backup_dir}")
        return True
    except Exception as e:
        print(f"Backup failed: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1:
        phase = sys.argv[1]
    else:
        phase = "pre_phase_update"
    create_backup(phase)


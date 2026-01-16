# Backup & Migration Guide: Windows to Linux

This guide explains how to backup all your data when transferring from Windows to Linux so you don't lose any users, schedules, or personal information.

## What Needs to be Backed Up

### Critical Files (MUST BACKUP)

#### 1. User Data Directory
All user data is stored in the `data/` directory. **This is the most important thing to backup.**

**Location:**
```
daily-wellness-scheduler/
└── data/
    ├── users.json                    # User accounts/authentication
    ├── admin@admin.admin/            # User 1 data
    │   ├── schedule.json             # Daily schedule
    │   ├── settings.json             # User settings
    │   ├── progress.json             # Daily progress tracking
    │   ├── tasks.json                # Tasks
    │   ├── nutrition_entries.json    # Food/nutrition logs
    │   ├── nutrition_goals.json      # Nutrition goals
    │   ├── weight_goals.json         # Weight tracking
    │   ├── water_tracker.json        # Water intake
    │   ├── chat_history.json         # AI coach chat
    │   ├── friends.json              # Social connections
    │   ├── notification_settings.json # Notification prefs
    │   ├── privacy_settings.json     # Privacy settings
    │   ├── username.json             # Username/display name
    │   └── template_backups/         # Schedule templates
    ├── user2@example.com/            # User 2 data (same structure)
    └── ...
```

**Backup Command:**
```powershell
# Windows - Copy entire data directory
xcopy /E /I /Y data backup_data_$(Get-Date -Format "yyyyMMdd")
```

#### 2. Users File (Root Level)
Contains all user accounts and authentication information.

**Files:**
- `users.json` - User accounts and passwords (hashed)

**Backup Command:**
```powershell
# Windows
copy users.json backup_users_$(Get-Date -Format "yyyyMMdd").json
```

#### 3. Backups Directory (Optional but Recommended)
If you have automatic backups enabled, preserve these too.

**Location:**
```
daily-wellness-scheduler/
└── backups/
    └── [user@email.com]_[timestamp]/
        └── [all user data files]
```

**Backup Command:**
```powershell
# Windows - Copy backups directory
xcopy /E /I /Y backups backup_backups_$(Get-Date -Format "yyyyMMdd")
```

### Optional Files (Nice to Have)

#### 4. Food Database (If Downloaded)
If you downloaded the food database, you might want to back it up to avoid re-downloading.

**Files:**
- `data/openfoodfacts_products.jsonl.gz` (can be several GB)
- `data/food_database.json` (processed database)

**Note:** This is optional - you can re-download it on Linux. Only backup if you want to avoid the large download.

#### 5. Configuration Files
Root-level config files (legacy support, might be empty if using data/ directory):

- `settings.json` (legacy, usually empty)
- `progress.json` (legacy, usually empty)
- `schedule.json` (legacy, usually empty)
- `user_settings.json` (legacy)

These are likely empty if you're using the new multi-user system, but backup to be safe.

## Complete Backup Script (Windows PowerShell)

Save this as `backup_data.ps1` in your project root:

```powershell
# Daily Wellness Scheduler - Complete Backup Script
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backup_$timestamp"

Write-Host "Creating backup directory: $backupDir" -ForegroundColor Green
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# 1. Backup data directory (ALL USER DATA)
Write-Host "Backing up data/ directory..." -ForegroundColor Yellow
xcopy /E /I /Y data "$backupDir\data" | Out-Null

# 2. Backup users.json
Write-Host "Backing up users.json..." -ForegroundColor Yellow
if (Test-Path "users.json") {
    Copy-Item "users.json" "$backupDir\users.json" -Force
}

# 3. Backup backups directory (if exists)
Write-Host "Backing up backups/ directory..." -ForegroundColor Yellow
if (Test-Path "backups") {
    xcopy /E /I /Y backups "$backupDir\backups" | Out-Null
}

# 4. Backup root config files (legacy)
Write-Host "Backing up config files..." -ForegroundColor Yellow
$configFiles = @("settings.json", "progress.json", "schedule.json", "user_settings.json")
foreach ($file in $configFiles) {
    if (Test-Path $file) {
        Copy-Item $file "$backupDir\$file" -Force
    }
}

# 5. Create a manifest of what was backed up
$manifest = @"
Daily Wellness Scheduler Backup
Backup Date: $(Get-Date)
Backup Location: $backupDir

Files Backed Up:
- data/ (all user data)
- users.json
- backups/ (if exists)
- Legacy config files (if exist)

To Restore:
1. Stop the application
2. Copy files from $backupDir to project root
3. Ensure data/ directory is in the correct location
4. Start the application

Total Size: $((Get-ChildItem $backupDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB) MB
"@

$manifest | Out-File "$backupDir\BACKUP_MANIFEST.txt"

Write-Host "`n✅ Backup complete!" -ForegroundColor Green
Write-Host "Backup location: $backupDir" -ForegroundColor Cyan
Write-Host "Manifest: $backupDir\BACKUP_MANIFEST.txt" -ForegroundColor Cyan
```

**To run:**
```powershell
.\backup_data.ps1
```

## Migration to Linux

### Step 1: Create Complete Backup on Windows

```powershell
# Run the backup script
.\backup_data.ps1

# Or manually:
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
xcopy /E /I /Y data "backup_data_$timestamp"
copy users.json "backup_users_$timestamp.json"
```

### Step 2: Transfer Backup to Linux

**Option A: Using USB Drive**
1. Copy the `backup_YYYYMMDD_HHMMSS` folder to USB drive
2. Transfer to Linux machine
3. Extract to project directory

**Option B: Using Network/SFTP**
```bash
# From Linux, download via SCP/RSYNC
scp -r user@windows-ip:/path/to/backup_* /path/to/daily-wellness-scheduler/
```

**Option C: Using Git (if data/ was accidentally committed)**
⚠️ **NOT RECOMMENDED** - But if you did, you can pull on Linux.

**Option D: Cloud Storage**
1. Upload backup folder to Google Drive/Dropbox/etc.
2. Download on Linux

### Step 3: Restore Data on Linux

```bash
# Navigate to project directory
cd daily-wellness-scheduler

# Stop application if running
# (Ctrl+C or kill process)

# Restore data directory
cp -r backup_YYYYMMDD_HHMMSS/data ./

# Restore users.json
cp backup_YYYYMMDD_HHMMSS/users.json ./

# Restore backups directory (optional)
cp -r backup_YYYYMMDD_HHMMSS/backups ./

# Fix permissions (important on Linux!)
chmod -R 755 data/
chmod 644 users.json
chmod -R 755 backups/

# Verify files are there
ls -la data/
cat users.json
```

### Step 4: Verify Migration

```bash
# Start the application
python3 start_app.py

# In a browser, log in with existing credentials
# Check that:
# - Your schedule is there
# - Your settings are preserved
# - Your progress history is intact
# - All users can log in
```

## Critical Checklist

Before migrating, verify you've backed up:

- [ ] `data/` directory (contains ALL user data)
- [ ] `users.json` (user accounts)
- [ ] `backups/` directory (if you want historical backups)
- [ ] Test restore on a temporary location first

## What NOT to Backup

You can skip these (will be recreated or are not needed):

- `node_modules/` - Run `npm install` on Linux
- `__pycache__/` - Python will recreate
- `.git/` - Already in git repository
- `venv/` or virtual environments - Create new on Linux
- `frontend/.next/` - Build artifacts, will be regenerated
- Large `.gz` files - Can re-download if needed

## File Structure After Migration

Your Linux directory should look like:

```
daily-wellness-scheduler/
├── data/                    # ✅ Restored from backup
│   ├── users.json          # ✅ Restored (if in data/)
│   ├── user1@email.com/    # ✅ Restored
│   └── user2@email.com/    # ✅ Restored
├── users.json              # ✅ Restored (root level)
├── backups/                # ✅ Restored (optional)
├── backend/
├── frontend/
└── ... (other project files)
```

## Troubleshooting

### Users Can't Log In After Migration

**Problem**: Passwords not working

**Solutions**:
1. Check `users.json` was copied correctly
2. Verify file permissions: `chmod 644 users.json`
3. Check for Windows line endings: `dos2unix users.json`

### Data Not Showing

**Problem**: App starts but no user data visible

**Solutions**:
1. Verify `data/` directory structure matches Windows
2. Check file permissions: `chmod -R 755 data/`
3. Check backend logs for errors loading data
4. Verify user email matches directory name (case-sensitive on Linux!)

### Permission Errors

**Problem**: "Permission denied" errors on Linux

**Solutions**:
```bash
# Fix all permissions
chmod -R 755 data/
chmod -R 755 backups/
chmod 644 users.json
```

## Quick Reference: What to Backup

| Item | Location | Size | Required? |
|------|----------|------|-----------|
| User Data | `data/` | Varies | ✅ **YES - CRITICAL** |
| User Accounts | `users.json` | Small | ✅ **YES - CRITICAL** |
| Historical Backups | `backups/` | Varies | ⚠️ Optional |
| Food Database | `data/openfoodfacts_products.jsonl.gz` | Several GB | ⚠️ Optional (can re-download) |

## Final Notes

- **Test First**: Always test restoring on a temporary location before wiping Windows data
- **Keep Original**: Keep the backup for at least a few days after successful migration
- **File Permissions**: Linux is case-sensitive and strict about permissions - fix them if needed
- **Path Separators**: Windows uses `\`, Linux uses `/` - be careful if manually editing paths

Good luck with your migration! 🚀

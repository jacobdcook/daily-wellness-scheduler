# Daily Wellness Scheduler - Complete Backup Script
# This script backs up all user data, settings, and configurations
# Run this before migrating to Linux or for regular backups

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backup_$timestamp"

Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "Daily Wellness Scheduler - Complete Backup" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Create backup directory
Write-Host "Creating backup directory: $backupDir" -ForegroundColor Green
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# 1. Backup data directory (ALL USER DATA - MOST IMPORTANT)
Write-Host "[1/4] Backing up data/ directory (user data)..." -ForegroundColor Yellow
if (Test-Path "data") {
    xcopy /E /I /Y /Q data "$backupDir\data" 2>$null | Out-Null
    $dataSize = (Get-ChildItem -Path data -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "  ✅ Data directory backed up ($([math]::Round($dataSize, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  data/ directory not found" -ForegroundColor Yellow
}

# 2. Backup users.json (User accounts)
Write-Host "[2/4] Backing up users.json (user accounts)..." -ForegroundColor Yellow
if (Test-Path "users.json") {
    Copy-Item "users.json" "$backupDir\users.json" -Force
    Write-Host "  ✅ users.json backed up" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  users.json not found" -ForegroundColor Yellow
}

# 3. Backup backups directory (Historical backups - optional)
Write-Host "[3/4] Backing up backups/ directory (historical backups)..." -ForegroundColor Yellow
if (Test-Path "backups") {
    $backupCount = (Get-ChildItem -Path backups -Directory).Count
    xcopy /E /I /Y /Q backups "$backupDir\backups" 2>$null | Out-Null
    Write-Host "  ✅ Backups directory backed up ($backupCount backup sets)" -ForegroundColor Green
} else {
    Write-Host "  ℹ️  backups/ directory not found (optional)" -ForegroundColor Gray
}

# 4. Backup root config files (legacy - might be empty)
Write-Host "[4/4] Backing up config files (legacy)..." -ForegroundColor Yellow
$configFiles = @("settings.json", "progress.json", "schedule.json", "user_settings.json", "user_progress.json")
$backedUpConfigs = 0
foreach ($file in $configFiles) {
    if (Test-Path $file) {
        Copy-Item $file "$backupDir\$file" -Force
        $backedUpConfigs++
    }
}
if ($backedUpConfigs -gt 0) {
    Write-Host "  ✅ $backedUpConfigs config file(s) backed up" -ForegroundColor Green
} else {
    Write-Host "  ℹ️  No legacy config files found (using data/ directory)" -ForegroundColor Gray
}

# Create a manifest of what was backed up
$totalSize = (Get-ChildItem -Path $backupDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
$manifest = @"
Daily Wellness Scheduler - Backup Manifest
==========================================

Backup Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Backup Location: $backupDir
Total Size: $([math]::Round($totalSize, 2)) MB

Files Backed Up:
----------------
✅ data/                    - All user data (schedules, settings, progress, etc.)
✅ users.json              - User accounts and authentication
✅ backups/                - Historical backup files (if exists)
✅ Legacy config files     - Root-level config files (if exist)

IMPORTANT:
----------
- This backup contains ALL user data and settings
- Keep this backup safe - it contains personal information
- Do NOT commit this backup to git (it contains user data)

To Restore:
-----------
1. Stop the application (if running)
2. Copy files from $backupDir to project root:
   - Copy data/ directory
   - Copy users.json
   - Copy backups/ directory (if exists)
   - Copy config files (if exist)
3. Ensure file permissions are correct (especially on Linux)
4. Start the application
5. Verify all users can log in and data is intact

For detailed migration instructions, see BACKUP_MIGRATION_GUIDE.md
"@

$manifest | Out-File "$backupDir\BACKUP_MANIFEST.txt" -Encoding UTF8

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "✅ BACKUP COMPLETE!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""
Write-Host "Backup location: $backupDir" -ForegroundColor Cyan
Write-Host "Total size: $([math]::Round($totalSize, 2)) MB" -ForegroundColor Cyan
Write-Host "Manifest: $backupDir\BACKUP_MANIFEST.txt" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  - Keep this backup safe" -ForegroundColor White
Write-Host "  - Test restore before deleting original data" -ForegroundColor White
Write-Host "  - See BACKUP_MIGRATION_GUIDE.md for migration instructions" -ForegroundColor White
Write-Host ""

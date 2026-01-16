# Setup Guide: Food Database

This guide explains how to download and set up the food database for nutrition tracking features like barcode scanning and photo recognition.

## Why Download the Food Database?

The food database enables:
- **Barcode Scanning**: Scan product barcodes to instantly log nutrition data
- **Photo Recognition**: Take photos of food to identify and log meals
- **Food Search**: Search a comprehensive database of foods and products
- **Nutrition Insights**: Get detailed nutrition information for any food

Without the database, these features will have limited functionality.

## Database Size

The OpenFoodFacts database is **large** (several GB when compressed, 20+ GB when extracted). Make sure you have:
- At least 25 GB free disk space
- A stable internet connection (download may take 30+ minutes)

## Download Methods

### Method 1: Using the Built-in Script (Recommended)

The project includes a Python script to automatically download the latest database:

**Windows:**
```powershell
python backend/download_openfoodfacts.py
```

**Linux:**
```bash
python3 backend/download_openfoodfacts.py
```

**What it does:**
- Downloads the latest OpenFoodFacts product database
- Saves to `data/openfoodfacts_products.jsonl.gz`
- Shows progress during download
- Automatically handles resuming if download is interrupted

**Download Options:**
You can customize the download with options:
```bash
# Limit download size (for testing - not recommended for full features)
python3 backend/download_openfoodfacts.py --limit 1000

# Specify output location
python3 backend/download_openfoodfacts.py --output /path/to/data/
```

### Method 2: Manual Download

1. **Visit OpenFoodFacts Data Portal**
   - Go to: https://world.openfoodfacts.org/data

2. **Download the Products JSONL File**
   - Look for "Open Food Facts products data"
   - Download the file: `products.jsonl.gz` or `en.openfoodfacts.org.products.csv.gz`

3. **Place the File**
   - Rename it to: `openfoodfacts_products.jsonl.gz`
   - Move it to the `data/` directory in your project
   - Final path: `data/openfoodfacts_products.jsonl.gz`

### Method 3: Using a Smaller Sample (For Testing)

If you just want to test the features, you can download a smaller sample:

```bash
# Windows
python backend/download_openfoodfacts.py --limit 10000

# Linux
python3 backend/download_openfoodfacts.py --limit 10000
```

This downloads only 10,000 products (much smaller file) but has limited coverage.

## Verification

After downloading, verify the database is working:

**Option 1: Check File Size**
```bash
# Windows
dir data\openfoodfacts_products.jsonl.gz

# Linux
ls -lh data/openfoodfacts_products.jsonl.gz
```

The file should be several GB in size (full database).

**Option 2: Test in the App**
1. Start the application
2. Go to Nutrition → Barcode Scanner
3. Try scanning a product barcode
4. If it finds the product, the database is working!

**Option 3: Check Backend Logs**
When you start the backend, it should show:
```
✅ Food database loaded: X products
```

## Database Updates

The OpenFoodFacts database is updated regularly. To get the latest products:

```bash
# Windows
python backend/download_openfoodfacts.py --update

# Linux
python3 backend/download_openfoodfacts.py --update
```

Or simply run the download script again - it will check for updates.

## Troubleshooting

### Download Fails / Timeout

**Problem**: Download stops or times out

**Solutions**:
1. Check your internet connection
2. Try again - the script can resume downloads
3. Use a smaller limit first to test: `--limit 1000`
4. Download manually using Method 2

### Not Enough Disk Space

**Problem**: Error about insufficient disk space

**Solutions**:
1. Free up space (you need ~25 GB free)
2. Use a smaller sample: `--limit 10000`
3. Store the database on an external drive (update path in config)

### Database Not Loading

**Problem**: App says "database not found" or "no products loaded"

**Solutions**:
1. Check file location: Should be at `data/openfoodfacts_products.jsonl.gz`
2. Check file name: Must be exactly `openfoodfacts_products.jsonl.gz`
3. Check file permissions (Linux): `chmod 644 data/openfoodfacts_products.jsonl.gz`
4. Check file size: If 0 bytes or very small, re-download

### Slow Performance

**Problem**: App is slow after loading database

**Solutions**:
1. This is normal on first load - the database needs to be indexed
2. Subsequent loads will be faster
3. Consider using a smaller sample if you only need basic features

## Importing the Database

After the `.jsonl.gz` file is downloaded, the app will automatically:
1. Extract and parse the file on first use
2. Build an index for fast searching
3. Load into memory (this may take a few minutes)

**First Load**: Be patient - the first import can take 5-10 minutes depending on your system.

**Subsequent Loads**: Much faster as the data is cached.

## Alternative: Use Online API (Limited)

If you don't want to download the full database, the app can use the OpenFoodFacts API directly, but this:
- Requires internet connection for every search
- Has rate limits
- Is slower than local database
- Has limited functionality

The local database is recommended for the best experience.

## File Locations Summary

- **Downloaded File**: `data/openfoodfacts_products.jsonl.gz`
- **Extracted Data**: Automatically handled by the app
- **Cache/Index**: Stored in `data/food_database.json` (auto-generated)
- **Backup Location**: `data/food_database.json.corrupted_backup` (if issues occur)

## Need Help?

If you're having issues:
1. Check the backend logs when starting the app
2. Verify file location and name
3. Try downloading a small sample first (`--limit 1000`)
4. Check disk space and permissions

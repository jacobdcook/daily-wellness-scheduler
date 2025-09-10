# Daily Wellness Scheduler

A Python desktop application that generates personalized 6-week supplement and electrolyte schedules based on your daily habits and timing preferences.

## Features

- **Smart Scheduling**: Automatically calculates optimal supplement timing based on meal schedules, study blocks, and workout times
- **Conflict Resolution**: Ensures proper spacing between supplements and meals to avoid absorption issues
- **Flexible Configuration**: Customize wake times, meal schedules, workout days, and optional supplements
- **Multiple Views**: Today's checklist, weekly overview, and 6-week calendar
- **Export Options**: Save schedules to CSV or iCal format for use in other applications
- **CLI Mode**: Run headless for automation or quick schedule printing

## Quick Start

### GUI Mode (Recommended)
```bash
python daily_wellness_scheduler.py
```

### CLI Mode
```bash
# Print today's schedule
python daily_wellness_scheduler.py --today

# Export to CSV
python daily_wellness_scheduler.py --export-csv my_schedule.csv

# Export to iCal
python daily_wellness_scheduler.py --export-ics my_schedule.ics

# Use sweaty day mode
python daily_wellness_scheduler.py --today --sweaty
```

## Installation

1. **Requirements**: Python 3.10 or higher
2. **Dependencies**: Uses only standard library modules (tkinter, json, datetime, csv)
3. **No additional packages needed**

## Configuration

The app comes pre-configured with a comprehensive supplement regimen including:

### Core Supplements
- **Electrolyte Mix**: Citric-free blend with Baja Gold salt, potassium bicarbonate, and ConcenTrace
- **Magnesium Glycinate**: 60-120mg elemental, taken before bed
- **PepZin GI**: Zinc-Carnosine for gut health, taken with meals
- **DGL**: Taken 10-15 minutes before meals
- **Aloe Vera Juice**: Between meals for digestive support
- **Probiotic**: On empty stomach for optimal absorption
- **Omega-3 + D3/K2**: With fat-containing meals

### Optional Supplements
- **Melatonin**: Low-dose sleep support
- **Slippery Elm Tea**: For throat irritation
- **L-Glutamine**: Gut healing support
- **Collagen Peptides**: Joint and skin health

## Timing Rules

The scheduler follows strict timing rules to ensure optimal absorption:

- **Meal Spacing**: Electrolytes and other supplements are scheduled at least 60 minutes away from meals
- **Empty Stomach**: Probiotics are taken on empty stomach, 30-60 minutes after waking
- **Before Meals**: DGL is taken 10-15 minutes before meals
- **Night Stack**: Aloe → Magnesium → Melatonin in the final 2 hours before bed
- **Workout Timing**: Electrolytes can be scheduled around workouts when appropriate

## Data Storage

- Settings and schedules are saved in `.local_private/supplement_schedule.json`
- This folder is automatically added to `.gitignore` to protect your personal data
- All data persists between sessions

## Testing

Run the test suite to verify scheduling logic:

```bash
python tests_schedule.py
```

Tests verify:
- Proper meal spacing for electrolytes
- Correct DGL timing before meals
- Empty stomach scheduling for probiotics
- Night stack ordering
- Conflict resolution
- Optional item toggling

## Usage Tips

1. **First Run**: The app opens with sensible defaults. Adjust your wake time, meal schedule, and study hours in the settings panel.

2. **Breakfast Mode**: Choose "Usually", "Sometimes", or "Skip Most Days". If "Sometimes", you can set specific days of the week.

3. **Electrolyte Intensity**: Toggle between "Light Day" and "Sweaty Day" to adjust sodium and potassium amounts.

4. **Workout Days**: Check the days you work out and set your workout time for optimal electrolyte scheduling.

5. **Generate Plan**: Click "Generate 6-Week Plan" to create your personalized schedule starting today.

6. **Export**: Use the export buttons to save your schedule to CSV (for spreadsheets) or iCal (for calendar apps).

## Troubleshooting

- **No Schedule**: Make sure to click "Generate 6-Week Plan" after adjusting settings
- **Timing Conflicts**: The app automatically resolves conflicts by shifting times up to 45 minutes
- **Missing Supplements**: Check that optional items are enabled in the settings panel

## File Structure

```
daily-wellness-scheduler/
├── daily_wellness_scheduler.py    # Main application
├── tests_schedule.py              # Test suite
├── README.md                      # This file
├── .gitignore                     # Excludes .local_private/
└── .local_private/                # Personal data (not committed)
    └── supplement_schedule.json   # Your settings and schedules
```

## License

This project is provided as-is for personal use. Feel free to modify and adapt to your needs.

---

**Note**: This application is designed for educational and personal use. Always consult with healthcare professionals before starting any supplement regimen.

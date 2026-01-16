import csv
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any
from fastapi import Depends
from fastapi.responses import Response, StreamingResponse
from io import StringIO, BytesIO
try:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    from reportlab.lib.units import inch
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

from .models import UserSettings

def generate_csv_export(schedule: Dict[str, List[Dict]], progress: Dict[str, Dict], settings: UserSettings) -> str:
    """Generate CSV export of schedule and progress"""
    output = StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["Date", "Time", "Item Name", "Dose", "Status", "Notes"])
    
    # Sort dates
    sorted_dates = sorted(schedule.keys())
    
    for date_str in sorted_dates:
        items = schedule[date_str]
        day_progress = progress.get(date_str, {})
        
        for item in items:
            item_data = item.get("item", {})
            scheduled_time = item.get("scheduled_time", "")
            
            # Parse time
            try:
                dt = datetime.fromisoformat(scheduled_time.replace("Z", "+00:00"))
                time_str = dt.strftime("%H:%M")
            except:
                time_str = scheduled_time
            
            # Get status
            item_id = item.get("id", "")
            status_val = day_progress.get(item_id, 0)
            status = "Completed" if status_val == 2 else "In Progress" if status_val == 1 else "Pending"
            
            writer.writerow([
                date_str,
                time_str,
                item_data.get("name", ""),
                item_data.get("dosage", ""),
                status,
                item_data.get("notes", "")
            ])
    
    return output.getvalue()

def generate_ical_export(schedule: Dict[str, List[Dict]], settings: UserSettings) -> str:
    """Generate iCal export"""
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Daily Wellness Scheduler//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH"
    ]
    
    sorted_dates = sorted(schedule.keys())
    
    for date_str in sorted_dates:
        items = schedule[date_str]
        
        for item in items:
            item_data = item.get("item", {})
            scheduled_time = item.get("scheduled_time", "")
            
            try:
                dt = datetime.fromisoformat(scheduled_time.replace("Z", "+00:00"))
                dt_end = dt + timedelta(minutes=15)  # 15 min duration
                
                dt_str = dt.strftime("%Y%m%dT%H%M%S")
                dt_end_str = dt_end.strftime("%Y%m%dT%H%M%S")
                
                name = item_data.get("name", "Wellness Item")
                notes = item_data.get("notes", "")
                
                lines.extend([
                    "BEGIN:VEVENT",
                    f"DTSTART:{dt_str}",
                    f"DTEND:{dt_end_str}",
                    f"SUMMARY:{name}",
                    f"DESCRIPTION:{notes}",
                    "STATUS:CONFIRMED",
                    "END:VEVENT"
                ])
            except:
                continue
    
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines)

def generate_json_export(schedule: Dict[str, List[Dict]], progress: Dict[str, Dict], settings: UserSettings) -> str:
    """Generate JSON export with full data"""
    # Handle both Pydantic v1 and v2
    try:
        if hasattr(settings, 'model_dump'):
            settings_dict = settings.model_dump()
        elif hasattr(settings, 'dict'):
            settings_dict = settings.dict()
        else:
            # Fallback: convert to dict manually
            settings_dict = {
                "wake_time": settings.wake_time,
                "bedtime": settings.bedtime,
                "dinner_time": settings.dinner_time,
                "breakfast_mode": settings.breakfast_mode,
                "lunch_mode": settings.lunch_mode,
                "dinner_mode": settings.dinner_mode,
                "study_start": settings.study_start,
                "study_end": settings.study_end,
                "workout_days": settings.workout_days,
                "electrolyte_intensity": settings.electrolyte_intensity,
                "timezone": settings.timezone,
                "optional_items": settings.optional_items,
                "fasting": settings.fasting,
                "fasting_level": settings.fasting_level,
                "feeding_window": settings.feeding_window,
            }
    except Exception as e:
        # If all else fails, use a basic dict representation
        settings_dict = {"error": f"Could not serialize settings: {str(e)}"}
    
    export_data = {
        "export_date": datetime.now().isoformat(),
        "settings": settings_dict,
        "schedule": schedule,
        "progress": progress,
        "metadata": {
            "version": "1.0",
            "total_days": len(schedule),
            "total_items": sum(len(items) for items in schedule.values())
        }
    }
    return json.dumps(export_data, indent=2, default=str)

def generate_pdf_export(schedule: Dict[str, List[Dict]], progress: Dict[str, Dict], settings: UserSettings) -> BytesIO:
    """Generate PDF export"""
    if not REPORTLAB_AVAILABLE:
        raise Exception("PDF export requires reportlab. Install with: pip install reportlab")
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    story = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=30,
    )
    story.append(Paragraph("Daily Wellness Schedule", title_style))
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Group by date
    sorted_dates = sorted(schedule.keys())
    
    for date_str in sorted_dates:
        items = schedule[date_str]
        if not items:
            continue
            
        # Date header
        try:
            dt = datetime.fromisoformat(date_str)
            date_display = dt.strftime("%A, %B %d, %Y")
        except:
            date_display = date_str
            
        story.append(Paragraph(f"<b>{date_display}</b>", styles['Heading2']))
        story.append(Spacer(1, 0.2*inch))
        
        # Table data
        table_data = [["Time", "Item", "Dose", "Status", "Notes"]]
        day_progress = progress.get(date_str, {})
        
        for item in items:
            item_data = item.get("item", {})
            scheduled_time = item.get("scheduled_time", "")
            
            try:
                dt = datetime.fromisoformat(scheduled_time.replace("Z", "+00:00"))
                time_str = dt.strftime("%I:%M %p")
            except:
                time_str = scheduled_time
            
            item_id = item.get("id", "")
            status_val = day_progress.get(item_id, 0)
            status = "✓" if status_val == 2 else "○" if status_val == 1 else "—"
            
            table_data.append([
                time_str,
                item_data.get("name", ""),
                item_data.get("dosage", ""),
                status,
                item_data.get("notes", "")[:50]  # Truncate long notes
            ])
        
        # Create table
        table = Table(table_data, colWidths=[1*inch, 2*inch, 1.2*inch, 0.6*inch, 2.2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
        ]))
        
        story.append(table)
        story.append(Spacer(1, 0.3*inch))
        
        # Page break if needed (every 3 days)
        if sorted_dates.index(date_str) % 3 == 2 and date_str != sorted_dates[-1]:
            story.append(PageBreak())
    
    doc.build(story)
    buffer.seek(0)
    return buffer

def generate_markdown_export(schedule: Dict[str, List[Dict]], progress: Dict[str, Dict], settings: UserSettings) -> str:
    """Generate Markdown export"""
    lines = []
    lines.append("# Daily Wellness Schedule\n")
    lines.append(f"*Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}*\n")
    lines.append("---\n")
    
    sorted_dates = sorted(schedule.keys())
    
    for date_str in sorted_dates:
        items = schedule[date_str]
        if not items:
            continue
            
        try:
            dt = datetime.fromisoformat(date_str)
            date_display = dt.strftime("%A, %B %d, %Y")
        except:
            date_display = date_str
            
        lines.append(f"\n## {date_display}\n")
        lines.append("| Time | Item | Dose | Status | Notes |\n")
        lines.append("|------|------|------|--------|-------|\n")
        
        day_progress = progress.get(date_str, {})
        
        for item in items:
            item_data = item.get("item", {})
            scheduled_time = item.get("scheduled_time", "")
            
            try:
                dt = datetime.fromisoformat(scheduled_time.replace("Z", "+00:00"))
                time_str = dt.strftime("%I:%M %p")
            except:
                time_str = scheduled_time
            
            item_id = item.get("id", "")
            status_val = day_progress.get(item_id, 0)
            status = "✓ Done" if status_val == 2 else "○ In Progress" if status_val == 1 else "— Pending"
            
            name = item_data.get("name", "")
            dose = item_data.get("dosage", "")
            notes = item_data.get("notes", "").replace("|", "\\|")
            
            lines.append(f"| {time_str} | {name} | {dose} | {status} | {notes} |\n")
    
    return "".join(lines)

def generate_summary_export(schedule: Dict[str, List[Dict]], progress: Dict[str, Dict], settings: UserSettings) -> str:
    """Generate summary statistics export"""
    total_days = len(schedule)
    total_items = sum(len(items) for items in schedule.values())
    
    completed_count = 0
    in_progress_count = 0
    pending_count = 0
    
    item_counts = {}
    
    for date_str, items in schedule.items():
        day_progress = progress.get(date_str, {})
        for item in items:
            item_data = item.get("item", {})
            item_name = item_data.get("name", "")
            item_id = item.get("id", "")
            status_val = day_progress.get(item_id, 0)
            
            if status_val == 2:
                completed_count += 1
            elif status_val == 1:
                in_progress_count += 1
            else:
                pending_count += 1
            
            if item_name not in item_counts:
                item_counts[item_name] = {"total": 0, "completed": 0}
            item_counts[item_name]["total"] += 1
            if status_val == 2:
                item_counts[item_name]["completed"] += 1
    
    lines = []
    lines.append("Wellness Schedule Summary\n")
    lines.append("=" * 50 + "\n\n")
    lines.append(f"Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}\n\n")
    lines.append("Overall Statistics:\n")
    lines.append(f"  Total Days: {total_days}\n")
    lines.append(f"  Total Items: {total_items}\n")
    lines.append(f"  Completed: {completed_count} ({completed_count/total_items*100:.1f}%)\n" if total_items > 0 else "  Completed: 0\n")
    lines.append(f"  In Progress: {in_progress_count}\n")
    lines.append(f"  Pending: {pending_count}\n\n")
    lines.append("Item Breakdown:\n")
    lines.append("-" * 50 + "\n")
    
    for item_name, counts in sorted(item_counts.items()):
        completion_rate = (counts["completed"] / counts["total"] * 100) if counts["total"] > 0 else 0
        lines.append(f"{item_name}:\n")
        lines.append(f"  Total: {counts['total']}\n")
        lines.append(f"  Completed: {counts['completed']} ({completion_rate:.1f}%)\n\n")
    
    return "".join(lines)


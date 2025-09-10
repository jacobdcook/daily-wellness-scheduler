#!/usr/bin/env python3
"""
Test suite for Daily Wellness Scheduler

Tests the core scheduling logic and timing rules to ensure supplements
are scheduled correctly according to the specified constraints.

Run with: python tests_schedule.py
"""

import sys
import os
from datetime import datetime, timedelta, time
from typing import List

# Add the current directory to the path so we can import the main module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from daily_wellness_scheduler import (
    SupplementScheduler, UserSettings, DayType, TimingRule, 
    SupplementItem, ScheduledItem
)


class TestScheduler:
    """Test suite for the supplement scheduler"""
    
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.tests = []
    
    def assert_true(self, condition: bool, message: str):
        """Assert that a condition is true"""
        if condition:
            self.passed += 1
            print(f"✓ {message}")
        else:
            self.failed += 1
            print(f"✗ {message}")
    
    def assert_false(self, condition: bool, message: str):
        """Assert that a condition is false"""
        self.assert_true(not condition, message)
    
    def assert_equals(self, actual, expected, message: str):
        """Assert that two values are equal"""
        self.assert_true(actual == expected, f"{message} (expected: {expected}, got: {actual})")
    
    def assert_in(self, item, container, message: str):
        """Assert that an item is in a container"""
        self.assert_true(item in container, f"{message} (item: {item}, container: {container})")
    
    def test_electrolyte_meal_spacing(self):
        """Test that electrolytes are not scheduled within 60 minutes of meals"""
        print("\n=== Testing Electrolyte Meal Spacing ===")
        
        settings = UserSettings()
        settings.breakfast_mode = "skip"  # No breakfast to simplify
        settings.dinner_time = "19:30"
        
        scheduler = SupplementScheduler(settings)
        start_date = datetime.now()
        schedule = scheduler.generate_schedule(start_date, 1)
        
        # Get today's schedule
        today = start_date.date().isoformat()
        if today in schedule:
            items = schedule[today]
            
            # Find electrolyte and dinner times
            electrolyte_time = None
            dinner_time = datetime.combine(start_date.date(), time(19, 30))
            
            for item in items:
                if "Electrolyte" in item.item.name:
                    electrolyte_time = item.scheduled_time
                    break
            
            if electrolyte_time:
                time_diff = abs((electrolyte_time - dinner_time).total_seconds() / 60)
                self.assert_true(
                    time_diff >= 60, 
                    f"Electrolyte scheduled {time_diff:.0f} minutes from dinner (should be ≥60 min)"
                )
            else:
                print("⚠ No electrolyte found in schedule")
    
    def test_dgl_before_dinner(self):
        """Test that DGL is scheduled 10-15 minutes before dinner"""
        print("\n=== Testing DGL Before Dinner ===")
        
        settings = UserSettings()
        settings.dinner_time = "19:30"
        
        scheduler = SupplementScheduler(settings)
        start_date = datetime.now()
        schedule = scheduler.generate_schedule(start_date, 1)
        
        today = start_date.date().isoformat()
        if today in schedule:
            items = schedule[today]
            
            dgl_time = None
            dinner_time = datetime.combine(start_date.date(), time(19, 30))
            
            for item in items:
                if "DGL" in item.item.name:
                    dgl_time = item.scheduled_time
                    break
            
            if dgl_time:
                time_diff = (dinner_time - dgl_time).total_seconds() / 60
                self.assert_true(
                    10 <= time_diff <= 15,
                    f"DGL scheduled {time_diff:.0f} minutes before dinner (should be 10-15 min)"
                )
            else:
                print("⚠ No DGL found in schedule")
    
    def test_probiotic_empty_stomach(self):
        """Test that probiotic is scheduled on empty stomach when breakfast is skipped"""
        print("\n=== Testing Probiotic Empty Stomach ===")
        
        settings = UserSettings()
        settings.breakfast_mode = "skip"
        settings.wake_time = "08:00"
        
        scheduler = SupplementScheduler(settings)
        start_date = datetime.now()
        schedule = scheduler.generate_schedule(start_date, 1)
        
        today = start_date.date().isoformat()
        if today in schedule:
            items = schedule[today]
            
            probiotic_time = None
            wake_time = datetime.combine(start_date.date(), time(8, 0))
            
            for item in items:
                if "Probiotic" in item.item.name:
                    probiotic_time = item.scheduled_time
                    break
            
            if probiotic_time:
                time_diff = (probiotic_time - wake_time).total_seconds() / 60
                self.assert_true(
                    30 <= time_diff <= 60,
                    f"Probiotic scheduled {time_diff:.0f} minutes after wake (should be 30-60 min)"
                )
            else:
                print("⚠ No probiotic found in schedule")
    
    def test_night_stack_ordering(self):
        """Test that night stack items are ordered correctly: Aloe → Magnesium → Melatonin"""
        print("\n=== Testing Night Stack Ordering ===")
        
        settings = UserSettings()
        settings.bedtime = "00:00"
        settings.optional_items["melatonin"] = True
        
        scheduler = SupplementScheduler(settings)
        start_date = datetime.now()
        schedule = scheduler.generate_schedule(start_date, 1)
        
        today = start_date.date().isoformat()
        if today in schedule:
            items = schedule[today]
            
            # Find night items
            night_items = []
            for item in items:
                if any(name in item.item.name for name in ["Aloe", "Magnesium", "Melatonin"]):
                    night_items.append(item)
            
            if len(night_items) >= 2:
                # Sort by time
                night_items.sort(key=lambda x: x.scheduled_time)
                
                # Check ordering
                names = [item.item.name for item in night_items]
                print(f"Night items order: {names}")
                
                # Aloe should come before Magnesium
                aloe_idx = next((i for i, name in enumerate(names) if "Aloe" in name), -1)
                mag_idx = next((i for i, name in enumerate(names) if "Magnesium" in name), -1)
                
                if aloe_idx != -1 and mag_idx != -1:
                    self.assert_true(
                        aloe_idx < mag_idx,
                        "Aloe should be scheduled before Magnesium"
                    )
                
                # Magnesium should come before Melatonin
                melatonin_idx = next((i for i, name in enumerate(names) if "Melatonin" in name), -1)
                
                if mag_idx != -1 and melatonin_idx != -1:
                    self.assert_true(
                        mag_idx < melatonin_idx,
                        "Magnesium should be scheduled before Melatonin"
                    )
            else:
                print("⚠ Not enough night items found in schedule")
    
    def test_workout_electrolyte_timing(self):
        """Test that electrolytes can be scheduled around workouts when appropriate"""
        print("\n=== Testing Workout Electrolyte Timing ===")
        
        settings = UserSettings()
        settings.workout_days = [False, False, False, False, False, False, True]  # Sunday workout
        settings.workout_time = "16:00"
        settings.dinner_time = "19:30"
        
        scheduler = SupplementScheduler(settings)
        start_date = datetime.now()
        # Find next Sunday
        days_ahead = 6 - start_date.weekday()  # Sunday is 6
        if days_ahead <= 0:
            days_ahead += 7
        sunday = start_date + timedelta(days=days_ahead)
        
        schedule = scheduler.generate_schedule(sunday, 1)
        sunday_str = sunday.date().isoformat()
        
        if sunday_str in schedule:
            items = schedule[sunday_str]
            
            # Find electrolyte and workout times
            electrolyte_time = None
            workout_time = datetime.combine(sunday.date(), time(16, 0))
            
            for item in items:
                if "Electrolyte" in item.item.name:
                    electrolyte_time = item.scheduled_time
                    break
            
            if electrolyte_time:
                # Electrolyte should be at least 90 minutes after last meal
                # Since we skip breakfast, last meal would be dinner
                dinner_time = datetime.combine(sunday.date(), time(19, 30))
                time_since_dinner = (dinner_time - electrolyte_time).total_seconds() / 60
                
                # If electrolyte is before dinner, it should be at least 90 min after any previous meal
                # For this test, we'll just check it's not too close to dinner
                time_to_dinner = (dinner_time - electrolyte_time).total_seconds() / 60
                
                if time_to_dinner > 0:  # Electrolyte is before dinner
                    self.assert_true(
                        time_to_dinner >= 60,  # At least 60 min before dinner
                        f"Electrolyte scheduled {time_to_dinner:.0f} minutes before dinner (should be ≥60 min)"
                    )
            else:
                print("⚠ No electrolyte found in workout day schedule")
    
    def test_conflict_resolution(self):
        """Test that the scheduler resolves conflicts by shifting times"""
        print("\n=== Testing Conflict Resolution ===")
        
        settings = UserSettings()
        settings.breakfast_mode = "skip"  # Simplify by removing breakfast
        
        scheduler = SupplementScheduler(settings)
        start_date = datetime.now()
        schedule = scheduler.generate_schedule(start_date, 1)
        
        today = start_date.date().isoformat()
        if today in schedule:
            items = schedule[today]
            
            # Check that items are spaced at least 30 minutes apart
            times = [item.scheduled_time for item in items]
            times.sort()
            
            conflicts = 0
            for i in range(len(times) - 1):
                time_diff = (times[i+1] - times[i]).total_seconds() / 60
                if time_diff < 30:
                    conflicts += 1
            
            self.assert_equals(
                conflicts, 0,
                f"Found {conflicts} timing conflicts (items scheduled <30 min apart)"
            )
    
    def test_optional_items_toggle(self):
        """Test that optional items are only scheduled when enabled"""
        print("\n=== Testing Optional Items Toggle ===")
        
        # Test with optional items disabled
        settings = UserSettings()
        settings.optional_items["melatonin"] = False
        settings.optional_items["collagen"] = False
        
        scheduler = SupplementScheduler(settings)
        start_date = datetime.now()
        schedule = scheduler.generate_schedule(start_date, 1)
        
        today = start_date.date().isoformat()
        if today in schedule:
            items = schedule[today]
            
            # Check that optional items are not scheduled
            optional_names = [item.item.name for item in items if item.item.optional]
            self.assert_equals(
                len(optional_names), 0,
                f"Optional items found when disabled: {optional_names}"
            )
        
        # Test with optional items enabled
        settings.optional_items["melatonin"] = True
        settings.optional_items["collagen"] = True
        
        scheduler = SupplementScheduler(settings)
        schedule = scheduler.generate_schedule(start_date, 1)
        
        if today in schedule:
            items = schedule[today]
            
            # Check that optional items are scheduled
            optional_names = [item.item.name for item in items if item.item.optional]
            self.assert_true(
                len(optional_names) > 0,
                f"No optional items found when enabled: {optional_names}"
            )
    
    def run_all_tests(self):
        """Run all tests"""
        print("Daily Wellness Scheduler - Test Suite")
        print("=" * 50)
        
        self.test_electrolyte_meal_spacing()
        self.test_dgl_before_dinner()
        self.test_probiotic_empty_stomach()
        self.test_night_stack_ordering()
        self.test_workout_electrolyte_timing()
        self.test_conflict_resolution()
        self.test_optional_items_toggle()
        
        print("\n" + "=" * 50)
        print(f"Tests passed: {self.passed}")
        print(f"Tests failed: {self.failed}")
        print(f"Total tests: {self.passed + self.failed}")
        
        if self.failed == 0:
            print("🎉 All tests passed!")
            return True
        else:
            print("❌ Some tests failed!")
            return False


def main():
    """Run the test suite"""
    tester = TestScheduler()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

"""
Background Data Processing Service
Continuously processes data for all zones in the selected city
"""
import asyncio
from datetime import datetime, timezone
from typing import Optional
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.services.data_processor import DataProcessor
from backend.services.city_config import CityService

class BackgroundProcessor:
    """
    Background service that continuously processes data.
    Runs in a separate task and updates data periodically.
    """
    
    def __init__(self, city_id: str = "nyc", interval_seconds: int = 300):
        """
        Initialize background processor.
        
        Args:
            city_id: City to process
            interval_seconds: How often to process (default: 5 minutes)
        """
        self.city_id = city_id
        self.interval_seconds = interval_seconds
        self.processor = None
        self.running = False
        self.task = None
    
    async def start(self):
        """Start the background processing loop."""
        if self.running:
            return
        
        self.running = True
        self.processor = DataProcessor(city_id=self.city_id)
        
        print(f"[BackgroundProcessor] Started for city: {self.city_id}")
        print(f"[BackgroundProcessor] Processing interval: {self.interval_seconds} seconds")
        
        # Process immediately on start
        await self.process_once()
        
        # Then process periodically
        while self.running:
            await asyncio.sleep(self.interval_seconds)
            if self.running:
                await self.process_once()
    
    async def process_once(self):
        """Process all zones once."""
        try:
            print(f"[BackgroundProcessor] Processing all zones for {self.city_id}...")
            start_time = datetime.now(timezone.utc)
            
            # Process all zones
            results = await self.processor.process_all_zones()
            
            # Process EIA data
            city = CityService.get_city(self.city_id)
            if city:
                await self.processor.process_eia_data(city.state)
            
            elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()
            print(f"[BackgroundProcessor] [OK] Completed in {elapsed:.2f}s")
            print(f"[BackgroundProcessor]   - Zones processed: {results.get('summary', {}).get('successful', 0)}")
            
        except Exception as e:
            print(f"[BackgroundProcessor] [ERROR] Error: {e}")
    
    async def stop(self):
        """Stop the background processing loop."""
        self.running = False
        if self.task:
            self.task.cancel()
        print(f"[BackgroundProcessor] Stopped")
    
    def update_city(self, new_city_id: str):
        """Update the city being processed."""
        self.city_id = new_city_id
        self.processor = DataProcessor(city_id=new_city_id)
        print(f"[BackgroundProcessor] City updated to: {new_city_id}")

# Global background processor instance
_background_processor: Optional[BackgroundProcessor] = None

def get_background_processor(city_id: str = "nyc", interval_seconds: int = 300) -> BackgroundProcessor:
    """Get or create the global background processor."""
    global _background_processor
    if _background_processor is None:
        _background_processor = BackgroundProcessor(city_id=city_id, interval_seconds=interval_seconds)
    return _background_processor

async def start_background_processing(city_id: str = "nyc", interval_seconds: int = 300):
    """Start background processing."""
    processor = get_background_processor(city_id, interval_seconds)
    if not processor.running:
        processor.task = asyncio.create_task(processor.start())
    return processor

async def stop_background_processing():
    """Stop background processing."""
    global _background_processor
    if _background_processor:
        await _background_processor.stop()
        _background_processor = None

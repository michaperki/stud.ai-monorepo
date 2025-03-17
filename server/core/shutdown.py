
import asyncio
import logging
import signal
import sys
import threading

logger = logging.getLogger(__name__)
shutdown_event = asyncio.Event()

async def shutdown():
    """Gracefully shutdown FastAPI server."""
    logger.info("Shutting down gracefully...")
    
    # Cancel all running tasks
    tasks = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]
    for task in tasks:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

    logger.info("All tasks cancelled. Stopping event loop.")
    
    shutdown_event.set()
    logger.info("Shutdown complete.")

def setup_signal_handlers():
    """Setup signal handlers for graceful shutdown."""
    if sys.platform == "win32":
        def windows_signal_handler():
            logger.info("CTRL+C detected. Shutting down...")
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(shutdown())

        def wait_for_ctrl_c():
            try:
                while not shutdown_event.is_set():
                    pass
            except KeyboardInterrupt:
                windows_signal_handler()

        thread = threading.Thread(target=wait_for_ctrl_c, daemon=True)
        thread.start()
    else:
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(sig, lambda: asyncio.create_task(shutdown()))


import logging

def configure_logging():
    """Configure global logging settings."""
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    )
    logger = logging.getLogger(__name__)
    logger.info(f"Configured log level: {logging.getLevelName(logger.getEffectiveLevel())}")
    return logger

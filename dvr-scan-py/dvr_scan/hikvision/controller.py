# dvr-scan-py/dvr_scan/hikvision/controller.py

import json
import logging
import sys

from dvr_scan.hikvision.helpers import ImageReader
from dvr_scan.hikvision.master_sector import MasterSectorParser
from dvr_scan.hikvision.hikbtree import HikbtreeParser
from dvr_scan.hikvision.system_logs import SystemLogParser
from dvr_scan.hikvision.extractor import VideoExtractor

logger = logging.getLogger("dvr_scan")

def run_hikvision_command(args):
    """Router for all hikvision subcommands."""
    if args.subcommand == "master":
        run_master_parser(args)
    elif args.subcommand == "hikbtree":
        run_hikbtree_parser(args)
    elif args.subcommand == "logs":
        run_system_logs_parser(args)
    elif args.subcommand == "extract":
        run_video_extractor(args)

def run_master_parser(args):
    reader = None
    try:
        reader = ImageReader(args.image)
        if not reader.open():
            sys.exit(1)
        
        parser = MasterSectorParser(reader)
        extra_offset = parser.run_parser(args.output_file)

        if extra_offset is not None:
            print(json.dumps({
                "type": "master_complete",
                "success": True,
                "output_file": args.output_file,
                "extra_offset": extra_offset
            }), flush=True)
        else:
            raise Exception("Master sector parsing failed.")

    except Exception as e:
        logger.critical(f"A critical error occurred: {e}", exc_info=True)
        print(json.dumps({"type": "error", "message": str(e)}), flush=True)
        sys.exit(1)
    finally:
        if reader:
            reader.close()

# ... similar functions for run_hikbtree_parser, run_system_logs_parser ...

def run_video_extractor(args):
    reader = None
    try:
        reader = ImageReader(args.image)
        if not reader.open(): sys.exit(1)
        
        extractor = VideoExtractor(reader, output_dir=args.output_dir)
        success, filepath = extractor.extract_single_block(args.offset, args.master_file, args.extra_offset)
        
        if success:
            print(json.dumps({"type": "extract_complete", "path": filepath}), flush=True)
        else:
            raise Exception("Video extraction failed.")

    except Exception as e:
        logging.critical(f"An unexpected critical error occurred: {e}", exc_info=True)
        print(json.dumps({"type": "error", "message": str(e)}), flush=True)
        sys.exit(1)
    finally:
        if reader: reader.close()
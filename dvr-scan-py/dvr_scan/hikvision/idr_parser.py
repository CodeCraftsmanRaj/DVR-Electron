# dvr-scan-py/dvr_scan/hikvision/idr_parser.py

import struct
from datetime import datetime
import logging

class IdrParser:
    """
    A helper class that provides logic for finding and parsing the IDR metadata
    table from within a single Hikvision data block. This class is intended to be
    imported and used by other scripts.
    """
    IDR_SIGNATURE = b'OFNI'
    IDR_RECORD_SIZE = 56

    def __init__(self, image_reader):
        self.reader = image_reader

    def parse_single_data_block(self, block_start_addr, block_size):
        """
        Reads from the end of a data block's allocated space and searches
        backwards to find and parse all IDR records.
        Returns a list of parsed records if found, otherwise None.
        """
        # A generous 10MB buffer is safe, fast, and covers worst-case scenarios
        search_buffer_size = 10 * 1024 * 1024
        block_end_addr = block_start_addr + block_size
        read_start_addr = block_end_addr - search_buffer_size

        if read_start_addr < block_start_addr:
            read_start_addr = block_start_addr
            search_buffer_size = block_end_addr - read_start_addr

        if search_buffer_size <= 0:
            logging.warning(f"  Invalid block size for block at {hex(block_start_addr)}. Skipping.")
            return None

        logging.info(f"  Reading {search_buffer_size / 1024:.0f} KB from the end of the data block to find IDR table...")

        try:
            data_chunk = self.reader.read(read_start_addr, search_buffer_size)
        except Exception as e:
            logging.error(f"  Could not read data from offset {hex(read_start_addr)}. Error: {e}")
            return None

        sig_pos_in_chunk = data_chunk.rfind(self.IDR_SIGNATURE)

        if sig_pos_in_chunk == -1:
            logging.warning("  No IDR ('OFNI') signature found at the end of this data block.")
            return None

        idr_records = []
        while sig_pos_in_chunk != -1:
            record_addr = read_start_addr + sig_pos_in_chunk
            record_data = data_chunk[sig_pos_in_chunk : sig_pos_in_chunk + self.IDR_RECORD_SIZE]
            if len(record_data) < self.IDR_RECORD_SIZE: break

            try:
                # Using the newly refined structure from your hex analysis
                rec_size = struct.unpack('<I', record_data[4:8])[0]
                if rec_size != 56: # Sanity check
                    logging.warning(f"  Record at {hex(record_addr)} has unexpected size {rec_size}. Skipping rest of table.")
                    break
                
                frame_index = struct.unpack('<I', record_data[12:16])[0]
                channel = struct.unpack('<B', record_data[16:17])[0]
                timestamp = struct.unpack('<I', record_data[24:28])[0]

                record = {
                    "address": record_addr, "frame_index": frame_index, "channel": channel,
                    "timestamp_unix": timestamp, "timestamp_readable": self._format_timestamp(timestamp)
                }
                idr_records.insert(0, record)
            except (struct.error, IndexError) as e:
                logging.warning(f"  Could not parse record at {hex(record_addr)}. Error: {e}")
                break 

            sig_pos_in_chunk = data_chunk.rfind(self.IDR_SIGNATURE, 0, sig_pos_in_chunk)

        logging.info(f"  Successfully parsed {len(idr_records)} IDR records for this block.")
        return idr_records

    def _format_timestamp(self, ts):
        if ts == 0 or ts >= 0x7FFFFFFF: return "Invalid/Not Set"
        try: return datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S UTC')
        except (OSError, ValueError): return f"Invalid Timestamp ({ts})"
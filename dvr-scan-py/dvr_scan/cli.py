# import argparse
# import typing as ty

# from dvr_scan import get_license_info
# from dvr_scan.config import CHOICE_MAP, USER_CONFIG_FILE_PATH, ConfigRegistry
# from dvr_scan.platform_utils import HAS_MOG2_CUDA
# from dvr_scan.region import RegionValidator
# from dvr_scan.shared import logfile_path
# from dvr_scan.shared.cli import (
#     VERSION_STRING,
#     LicenseAction,
#     VersionAction,
#     float_type_check,
#     int_type_check,
#     kernel_size_type_check,
#     string_type_check,
#     timecode_type_check,
# )

# # In the CLI, -so/--scan-only is a different flag than -m/--output-mode, whereas in the
# # config file they are the same option. Therefore, we remove the scan only choice
# # from the -m/--output-mode choices listed in the CLI.
# SCAN_ONLY_MODE = "scan_only"
# assert SCAN_ONLY_MODE in CHOICE_MAP["output-mode"]

# VALID_OUTPUT_MODES = [mode for mode in CHOICE_MAP["output-mode"] if mode != SCAN_ONLY_MODE]

# BACKGROUND_SUBTRACTORS = ["MOG2", "CNT", "MOG2_CUDA"] if HAS_MOG2_CUDA else ["MOG2", "CNT"]

# LOGFILE_PATH = logfile_path(name_prefix="dvr-scan")

# class RegionAction(argparse.Action):
#     DEFAULT_ERROR_MESSAGE = "Region must be 3 or more points of the form X0 Y0 X1 Y1 X2 Y2 ..."

#     def __init__(
#         self,
#         option_strings,
#         dest,
#         nargs=None,
#         const=None,
#         default=None,
#         type=None,
#         choices=None,
#         required=False,
#         help=None,
#         metavar=None,
#     ):
#         assert nargs == "*"
#         assert const is None
#         super(RegionAction, self).__init__(
#             option_strings=option_strings,
#             dest=dest,
#             nargs=nargs,
#             const=const,
#             default=default,
#             type=type,
#             choices=choices,
#             required=required,
#             help=help,
#             metavar=metavar,
#         )

#     def __call__(self, parser, namespace, values: ty.List[str], option_string=None):
#         try:
#             region = RegionValidator(" ".join(values))
#         except ValueError as ex:
#             message = " ".join(str(arg) for arg in ex.args)
#             raise (
#                 argparse.ArgumentError(
#                     self, message if message else RegionAction.DEFAULT_ERROR_MESSAGE
#                 )
#             ) from ex

#         items = getattr(namespace, self.dest, [])
#         items += [region.value]
#         setattr(namespace, self.dest, items)

# def get_cli_parser(user_config: ConfigRegistry):
#     """Creates the DVR-Scan argparse command-line interface with subcommands."""

#     parser = argparse.ArgumentParser(
#         description="DVR-Scan: A tool for video motion detection and DVR image extraction.",
#         formatter_class=argparse.ArgumentDefaultsHelpFormatter,
#         exit_on_error=not user_config.get("debug"),
#     )

#     # Global arguments
#     parser.add_argument(
#         "-V", "--version", action=VersionAction, version=VERSION_STRING
#     )
#     parser.add_argument(
#         "-L", "--license", action=LicenseAction, version=get_license_info()
#     )
#     parser.add_argument(
#         "--debug", action="store_true", help=argparse.SUPPRESS, default=False
#     )
#     parser.add_argument(
#         "--ignore-user-config",
#         action="store_true",
#         default=False,
#         help="Ignore loading the user config file if present.",
#     )

#     # --- Create Sub-parsers for 'scan' and 'extract' commands ---
#     subparsers = parser.add_subparsers(
#         dest="command", required=True, help="Available commands"
#     )

#     # ===================================================================
#     #   SCAN command parser
#     # ===================================================================
#     parser_scan = subparsers.add_parser(
#         "scan",
#         help="Scan video files for motion events.",
#         formatter_class=argparse.ArgumentDefaultsHelpFormatter,
#         argument_default=argparse.SUPPRESS,
#     )

#     if hasattr(parser_scan, "_optionals"):
#         parser_scan._optionals.title = "scan arguments"

#     parser_scan.add_argument(
#         "-i",
#         "--input",
#         metavar="video_file",
#         required=True,
#         type=str,
#         nargs="+",
#         action="append",
#         help=(
#             "[REQUIRED] Path to input video. May specify multiple inputs with the same"
#             " resolution and framerate, or by specifying a wildcard/glob. Output"
#             " filenames are generated using the first video name only."
#         ),
#     )
#     parser_scan.add_argument(
#         "-d",
#         "--output-dir",
#         metavar="path",
#         type=str,
#         help=(
#             "If specified, write output files in the given directory. If path does not"
#             " exist, it will be created. If unset, output files are written to the"
#             " current working directory."
#         ),
#     )
#     parser_scan.add_argument(
#         "-o",
#         "--output",
#         metavar="video.avi",
#         type=str,
#         help=(
#             "If specified, all motion events will be written to a single file"
#             " in order (if not specified, separate files are created for each event)."
#             " Filename MUST end with .avi. Only supported in output mode OPENCV."
#         ),
#     )
#     parser_scan.add_argument(
#         "-m",
#         "--output-mode",
#         metavar="mode",
#         type=string_type_check(VALID_OUTPUT_MODES, False, "mode"),
#         help=(
#             "Set mode for generating output files. Certain features may not work with "
#             " all output modes. Must be one of: %s.%s"
#             % (
#                 ", ".join(VALID_OUTPUT_MODES),
#                 user_config.get_help_string("output-mode"),
#             )
#         ),
#     )
#     parser_scan.add_argument(
#         "-so",
#         "--scan-only",
#         action="store_true",
#         default=False,
#         help=(
#             "Only perform motion detection (does not write any files to disk)."
#             " If set, -m/--output-mode is ignored."
#         ),
#     )
#     parser_scan.add_argument(
#         "-c",
#         "--config",
#         metavar="settings.cfg",
#         type=str,
#         help=(
#             "Path to config file. If not set, tries to load one from %s" % (USER_CONFIG_FILE_PATH)
#         ),
#     )
#     parser_scan.add_argument(
#         "-r",
#         "--region-editor",
#         dest="region_editor",
#         action="store_true",
#         help=(
#             "Show region editor window. Motion detection will be limited to the enclosed area "
#             "during processing. Only single regions can be edited, but supports preview of "
#             "multiple regions if defined.%s" % user_config.get_help_string("region-editor")
#         ),
#     )
#     parser_scan.add_argument(
#         "-a",
#         "--add-region",
#         metavar="X0 Y0 X1 Y1 X2 Y2",
#         dest="regions",
#         nargs="*",
#         action=RegionAction,
#         help=(
#             "Limit motion detection to a region of the frame. The region is defined as a sequence "
#             "of 3 or more points forming a closed shape inside the video. Coordinate 0 0 is top "
#             "left of the frame, and WIDTH-1 HEIGHT-1 is bottom right. Can be specified multiple "
#             "times to add more regions."
#         ),
#     )
#     parser_scan.add_argument(
#         "-R",
#         "--load-region",
#         metavar="REGIONS.txt",
#         type=str,
#         help=(
#             "Load region data from file. Each line must be a list of points in the format "
#             "specified by -a/--add-region. Each line is treated as a separate polygon."
#         ),
#     )
#     parser_scan.add_argument(
#         "-s",
#         "--save-region",
#         metavar="REGIONS.txt",
#         type=str,
#         help=(
#             "Save regions before processing. If REGIONS.txt exists it will be overwritten. "
#             "The region editor will save regions here instead of asking for a path."
#         ),
#     )
#     MOG2_CUDA = ", MOG2_CUDA (Nvidia GPU)" if HAS_MOG2_CUDA else ""
#     parser_scan.add_argument(
#         "-b",
#         "--bg-subtractor",
#         metavar="type",
#         type=string_type_check(BACKGROUND_SUBTRACTORS, False, "type"),
#         help=(
#             "The type of background subtractor to use, must be one of: "
#             f" MOG2 (default), CNT (parallel){MOG2_CUDA}.%s"
#         )
#         % user_config.get_help_string("bg-subtractor"),
#     )
#     parser_scan.add_argument(
#         "-t",
#         "--threshold",
#         metavar="value",
#         type=float_type_check(0.0, None, "value"),
#         help=(
#             "Threshold representing amount of motion in a frame required to trigger"
#             " motion events. Lower values are more sensitive to motion. If too high,"
#             " some movement in the scene may not be detected, while too low of a"
#             " threshold can result in false detections.%s"
#             % (user_config.get_help_string("threshold"))
#         ),
#     )
#     parser_scan.add_argument(
#         "-k",
#         "--kernel-size",
#         metavar="size",
#         type=kernel_size_type_check(metavar="size"),
#         help=(
#             "Size in pixels of the noise reduction kernel. Must be odd number greater than 1, "
#             "0 to disable, or -1 to auto-set based on video resolution (default). If the kernel "
#             "size is set too large, some movement in the scene may not be detected.%s"
#             % (user_config.get_help_string("kernel-size"))
#         ),
#     )
#     parser_scan.add_argument(
#         "-l",
#         "--min-event-length",
#         metavar="time",
#         type=timecode_type_check("time"),
#         help=(
#             "Length of time that must contain motion before triggering a new event. Can be"
#             " specified as frames (123), seconds (12.3s), or timecode (00:00:01).%s"
#             % user_config.get_help_string("min-event-length")
#         ),
#     )
#     parser_scan.add_argument(
#         "-tb",
#         "--time-before-event",
#         metavar="time",
#         type=timecode_type_check("time"),
#         help=(
#             "Maximum amount of time to include before each event. Can be specified as"
#             " frames (123), seconds (12.3s), or timecode (00:00:01).%s"
#             % user_config.get_help_string("time-before-event")
#         ),
#     )
#     parser_scan.add_argument(
#         "-tp",
#         "--time-post-event",
#         metavar="time",
#         type=timecode_type_check("time"),
#         help=(
#             "Maximum amount of time to include after each event. The event will end once no"
#             " motion has been detected for this period of time. Can be specified as frames (123),"
#             " seconds (12.3s), or timecode (00:00:01).%s"
#             % user_config.get_help_string("time-post-event")
#         ),
#     )
#     parser_scan.add_argument(
#         "-st",
#         "--start-time",
#         metavar="time",
#         type=timecode_type_check("time"),
#         help=(
#             "Time to seek to in video before performing detection. Can be"
#             " given in number of frames (12345), seconds (number followed"
#             " by s, e.g. 123s or 123.45s), or timecode (HH:MM:SS[.nnn])."
#         ),
#     )
#     parser_scan.add_argument(
#         "-dt",
#         "--duration",
#         metavar="time",
#         type=timecode_type_check("time"),
#         help=(
#             "Duration stop processing the input after (see -st for valid timecode formats)."
#             " Overrides -et."
#         ),
#     )
#     parser_scan.add_argument(
#         "-et",
#         "--end-time",
#         metavar="time",
#         type=timecode_type_check("time"),
#         help=("Timecode to stop processing the input (see -st for valid timecode formats)."),
#     )
#     parser_scan.add_argument(
#         "-roi",
#         "--region-of-interest",
#         dest="region_of_interest",
#         metavar="x0 y0 w h",
#         nargs="*",
#         help=argparse.SUPPRESS,
#     )
#     parser_scan.add_argument(
#         "-bb",
#         "--bounding-box",
#         metavar="smooth_time",
#         type=timecode_type_check("smooth_time"),
#         nargs="?",
#         const=True,
#         help=(
#             "If set, draws a bounding box around the area where motion was detected. The amount"
#             " of temporal smoothing can be specified in either frames (12345) or seconds (number"
#             " followed by s, e.g. 123s or 123.45s). If omitted, defaults to 0.1s. If set to 0,"
#             " smoothing is disabled.%s"
#             % (user_config.get_help_string("bounding-box", show_default=False))
#         ),
#     )
#     parser_scan.add_argument(
#         "-tc",
#         "--time-code",
#         action="store_true",
#         help=(
#             "Draw time code in top left corner of each frame.%s"
#             % user_config.get_help_string("time-code", show_default=False)
#         ),
#     )
#     parser_scan.add_argument(
#         "-fm",
#         "--frame-metrics",
#         action="store_true",
#         help=(
#             "Draw frame metrics in top right corner of each frame.%s"
#             % user_config.get_help_string("frame-metrics", show_default=False)
#         ),
#     )
#     parser_scan.add_argument(
#         "-mo",
#         "--mask-output",
#         metavar="motion_mask.avi",
#         type=str,
#         help=(
#             "Write a video containing the motion mask of each frame. Useful when tuning "
#             "detection parameters."
#         ),
#     )
#     parser_scan.add_argument(
#         "-df",
#         "--downscale-factor",
#         metavar="factor",
#         type=int_type_check(0, None, "factor"),
#         help=(
#             "Integer factor to downscale (shrink) video before processing, to"
#             " improve performance. For example, if input video resolution"
#             " is 1024 x 400, and factor=2, each frame is reduced to"
#             " 1024/2 x 400/2=512 x 200 before processing.%s"
#             % (user_config.get_help_string("downscale-factor"))
#         ),
#     )
#     parser_scan.add_argument(
#         "-fs",
#         "--frame-skip",
#         metavar="num_frames",
#         type=int_type_check(0, None, "num_frames"),
#         help=(
#             "Number of frames to skip after processing a given frame."
#             " Improves performance, at expense of frame and time accuracy,"
#             " and may increase probability of missing motion events."
#             " If set, -l, -tb, and -tp will all be scaled relative to the source"
#             " framerate. Values above 1 or 2 are not recommended.%s"
#             % (user_config.get_help_string("frame-skip"))
#         ),
#     )
#     parser_scan.add_argument(
#         "-q",
#         "--quiet",
#         dest="quiet_mode",
#         action="store_true",
#         help=(
#             "Suppress all output except for final comma-separated list of motion events."
#             " Useful for computing or piping output directly into other programs/scripts.%s"
#             % user_config.get_help_string("quiet-mode")
#         ),
#     )
#     parser_scan.add_argument(
#         "--json-output",
#         action="store_true",
#         help=argparse.SUPPRESS, # Hide from user help
#         default=False,
#     )
#     parser_scan.add_argument(
#         "--logfile",
#         metavar="file",
#         type=str,
#         help=(
#             "Appends application output to file. If file does not exist it will be created. "
#             f"Log path: {LOGFILE_PATH.parent}"
#         ),
#     )
#     parser_scan.add_argument(
#         "--thumbnails",
#         metavar="method",
#         type=str,
#         default=None,
#         help=("Produce event thumbnail(s)."),
#     )
#     parser_scan.add_argument(
#         "-v",
#         "--verbosity",
#         metavar="type",
#         type=string_type_check(CHOICE_MAP["verbosity"], False, "type"),
#         help=(
#             "Amount of verbosity to use for log output. Must be one of: %s.%s"
#             % (
#                 ", ".join(CHOICE_MAP["verbosity"]),
#                 user_config.get_help_string("verbosity"),
#             )
#         ),
#     )
#     parser_scan.add_argument(
#         "--use-pts",
#         action="store_true",
#         default=False,
#         help=("Use OpenCV provided presentation timestamp instead of calculated version."),
#     )

#     # ===================================================================
#     #   EXTRACT command parser
#     # ===================================================================
#     parser_extract = subparsers.add_parser(
#         "extract",
#         help="Extract a video block from a Hikvision DVR image.",
#         formatter_class=argparse.ArgumentDefaultsHelpFormatter,
#     )

#     if hasattr(parser_extract, "_optionals"):
#         parser_extract._optionals.title = "extract arguments"

#     parser_extract.add_argument(
#         "--image",
#         dest="extract_image",
#         required=True,
#         type=str,
#         help="Path to the disk image file (e.g., '.dd' or '.E01')."
#     )
#     parser_extract.add_argument(
#         "--master-file",
#         required=True,
#         type=str,
#         help="Path to the JSON file containing master sector info."
#     )
#     parser_extract.add_argument(
#         "--offset",
#         required=True,
#         type=str,
#         help="The hex offset of the data block to extract (e.g., '0xfc4c5e000')."
#     )
#     parser_extract.add_argument(
#         "-d",
#         "--output-dir",
#         type=str,
#         default="video_exports",
#         help="Directory to save the extracted H.264 file."
#     )
#     parser_extract.add_argument(
#         "--extra-offset",
#         type=int,
#         default=0,
#         help="An additional decimal offset to add to the block start address."
#     )
#     parser_extract.add_argument(
#         "--json-output",
#         action="store_true",
#         help=argparse.SUPPRESS,
#         default=False,
#     )
    
#     return parser

#
#      DVR-Scan: Video Motion Event Detection & Extraction Tool
#   --------------------------------------------------------------
#       [  Site: https://www.dvr-scan.com/                 ]
#       [  Repo: https://github.com/Breakthrough/DVR-Scan  ]
#
# Copyright (C) 2.24 Brandon Castellano <http://www.bcastell.com>.
# DVR-Scan is licensed under the BSD 2-Clause License; see the included
# LICENSE file, or visit one of the above pages for details.
#
import argparse
import typing as ty

from dvr_scan import get_license_info
from dvr_scan.config import CHOICE_MAP, USER_CONFIG_FILE_PATH, ConfigRegistry
from dvr_scan.platform_utils import HAS_MOG2_CUDA
from dvr_scan.region import RegionValidator
from dvr_scan.shared import logfile_path
from dvr_scan.shared.cli import (
    VERSION_STRING,
    LicenseAction,
    VersionAction,
    float_type_check,
    int_type_check,
    kernel_size_type_check,
    string_type_check,
    timecode_type_check,
)

# In the CLI, -so/--scan-only is a different flag than -m/--output-mode, whereas in the
# config file they are the same option. Therefore, we remove the scan only choice
# from the -m/--output-mode choices listed in the CLI.
SCAN_ONLY_MODE = "scan_only"
assert SCAN_ONLY_MODE in CHOICE_MAP["output-mode"]

VALID_OUTPUT_MODES = [mode for mode in CHOICE_MAP["output-mode"] if mode != SCAN_ONLY_MODE]

BACKGROUND_SUBTRACTORS = ["MOG2", "CNT", "MOG2_CUDA"] if HAS_MOG2_CUDA else ["MOG2", "CNT"]

LOGFILE_PATH = logfile_path(name_prefix="dvr-scan")

class RegionAction(argparse.Action):
    DEFAULT_ERROR_MESSAGE = "Region must be 3 or more points of the form X0 Y0 X1 Y1 X2 Y2 ..."

    def __init__(
        self,
        option_strings,
        dest,
        nargs=None,
        const=None,
        default=None,
        type=None,
        choices=None,
        required=False,
        help=None,
        metavar=None,
    ):
        assert nargs == "*"
        assert const is None
        super(RegionAction, self).__init__(
            option_strings=option_strings,
            dest=dest,
            nargs=nargs,
            const=const,
            default=default,
            type=type,
            choices=choices,
            required=required,
            help=help,
            metavar=metavar,
        )

    def __call__(self, parser, namespace, values: ty.List[str], option_string=None):
        try:
            region = RegionValidator(" ".join(values))
        except ValueError as ex:
            message = " ".join(str(arg) for arg in ex.args)
            raise (
                argparse.ArgumentError(
                    self, message if message else RegionAction.DEFAULT_ERROR_MESSAGE
                )
            ) from ex

        items = getattr(namespace, self.dest, [])
        items += [region.value]
        setattr(namespace, self.dest, items)

def get_cli_parser(user_config: ConfigRegistry):
    """Creates the DVR-Scan argparse command-line interface with subcommands."""

    parser = argparse.ArgumentParser(
        description="DVR-Scan: A tool for video motion detection and DVR image extraction.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
        exit_on_error=not user_config.get("debug"),
    )

    # ===================================================================
    #   Global Arguments (apply to all commands)
    # ===================================================================
    parser.add_argument(
        "-V", "--version", action=VersionAction, version=VERSION_STRING
    )
    parser.add_argument(
        "-L", "--license", action=LicenseAction, version=get_license_info()
    )
    parser.add_argument(
        "--debug", action="store_true", help=argparse.SUPPRESS, default=False
    )
    parser.add_argument(
        "--ignore-user-config",
        action="store_true",
        default=False,
        help="Ignore loading the user config file if present.",
    )
    # CORRECTED: --json-output is now a global argument
    parser.add_argument(
        "--json-output",
        action="store_true",
        help=argparse.SUPPRESS, # Hide from user help
        default=False,
    )

    # --- Create Sub-parsers for 'scan' and 'extract' commands ---
    subparsers = parser.add_subparsers(
        dest="command", required=True, help="Available commands"
    )

    # ===================================================================
    #   SCAN command parser
    # ===================================================================
    parser_scan = subparsers.add_parser(
        "scan",
        help="Scan video files for motion events.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
        argument_default=argparse.SUPPRESS,
    )

    if hasattr(parser_scan, "_optionals"):
        parser_scan._optionals.title = "scan arguments"

    parser_scan.add_argument(
        "-i",
        "--input",
        metavar="video_file",
        required=True,
        type=str,
        nargs="+",
        action="append",
        help=(
            "[REQUIRED] Path to input video. May specify multiple inputs with the same"
            " resolution and framerate, or by specifying a wildcard/glob. Output"
            " filenames are generated using the first video name only."
        ),
    )
    parser_scan.add_argument(
        "-d",
        "--output-dir",
        metavar="path",
        type=str,
        help=(
            "If specified, write output files in the given directory. If path does not"
            " exist, it will be created. If unset, output files are written to the"
            " current working directory."
        ),
    )
    parser_scan.add_argument(
        "-o",
        "--output",
        metavar="video.avi",
        type=str,
        help=(
            "If specified, all motion events will be written to a single file"
            " in order (if not specified, separate files are created for each event)."
            " Filename MUST end with .avi. Only supported in output mode OPENCV."
        ),
    )
    parser_scan.add_argument(
        "-m",
        "--output-mode",
        metavar="mode",
        type=string_type_check(VALID_OUTPUT_MODES, False, "mode"),
        help=(
            "Set mode for generating output files. Certain features may not work with "
            " all output modes. Must be one of: %s.%s"
            % (
                ", ".join(VALID_OUTPUT_MODES),
                user_config.get_help_string("output-mode"),
            )
        ),
    )
    parser_scan.add_argument(
        "-so",
        "--scan-only",
        action="store_true",
        default=False,
        help=(
            "Only perform motion detection (does not write any files to disk)."
            " If set, -m/--output-mode is ignored."
        ),
    )
    parser_scan.add_argument(
        "-c",
        "--config",
        metavar="settings.cfg",
        type=str,
        help=(
            "Path to config file. If not set, tries to load one from %s" % (USER_CONFIG_FILE_PATH)
        ),
    )
    parser_scan.add_argument(
        "-r",
        "--region-editor",
        dest="region_editor",
        action="store_true",
        help=(
            "Show region editor window. Motion detection will be limited to the enclosed area "
            "during processing. Only single regions can be edited, but supports preview of "
            "multiple regions if defined.%s" % user_config.get_help_string("region-editor")
        ),
    )
    parser_scan.add_argument(
        "-a",
        "--add-region",
        metavar="X0 Y0 X1 Y1 X2 Y2",
        dest="regions",
        nargs="*",
        action=RegionAction,
        help=(
            "Limit motion detection to a region of the frame. The region is defined as a sequence "
            "of 3 or more points forming a closed shape inside the video. Coordinate 0 0 is top "
            "left of the frame, and WIDTH-1 HEIGHT-1 is bottom right. Can be specified multiple "
            "times to add more regions."
        ),
    )
    parser_scan.add_argument(
        "-R",
        "--load-region",
        metavar="REGIONS.txt",
        type=str,
        help=(
            "Load region data from file. Each line must be a list of points in the format "
            "specified by -a/--add-region. Each line is treated as a separate polygon."
        ),
    )
    parser_scan.add_argument(
        "-s",
        "--save-region",
        metavar="REGIONS.txt",
        type=str,
        help=(
            "Save regions before processing. If REGIONS.txt exists it will be overwritten. "
            "The region editor will save regions here instead of asking for a path."
        ),
    )
    MOG2_CUDA = ", MOG2_CUDA (Nvidia GPU)" if HAS_MOG2_CUDA else ""
    parser_scan.add_argument(
        "-b",
        "--bg-subtractor",
        metavar="type",
        type=string_type_check(BACKGROUND_SUBTRACTORS, False, "type"),
        help=(
            "The type of background subtractor to use, must be one of: "
            f" MOG2 (default), CNT (parallel){MOG2_CUDA}.%s"
        )
        % user_config.get_help_string("bg-subtractor"),
    )
    parser_scan.add_argument(
        "-t",
        "--threshold",
        metavar="value",
        type=float_type_check(0.0, None, "value"),
        help=(
            "Threshold representing amount of motion in a frame required to trigger"
            " motion events. Lower values are more sensitive to motion. If too high,"
            " some movement in the scene may not be detected, while too low of a"
            " threshold can result in false detections.%s"
            % (user_config.get_help_string("threshold"))
        ),
    )
    parser_scan.add_argument(
        "-k",
        "--kernel-size",
        metavar="size",
        type=kernel_size_type_check(metavar="size"),
        help=(
            "Size in pixels of the noise reduction kernel. Must be odd number greater than 1, "
            "0 to disable, or -1 to auto-set based on video resolution (default). If the kernel "
            "size is set too large, some movement in the scene may not be detected.%s"
            % (user_config.get_help_string("kernel-size"))
        ),
    )
    parser_scan.add_argument(
        "-l",
        "--min-event-length",
        metavar="time",
        type=timecode_type_check("time"),
        help=(
            "Length of time that must contain motion before triggering a new event. Can be"
            " specified as frames (123), seconds (12.3s), or timecode (00:00:01).%s"
            % user_config.get_help_string("min-event-length")
        ),
    )
    parser_scan.add_argument(
        "-tb",
        "--time-before-event",
        metavar="time",
        type=timecode_type_check("time"),
        help=(
            "Maximum amount of time to include before each event. Can be specified as"
            " frames (123), seconds (12.3s), or timecode (00:00:01).%s"
            % user_config.get_help_string("time-before-event")
        ),
    )
    parser_scan.add_argument(
        "-tp",
        "--time-post-event",
        metavar="time",
        type=timecode_type_check("time"),
        help=(
            "Maximum amount of time to include after each event. The event will end once no"
            " motion has been detected for this period of time. Can be specified as frames (123),"
            " seconds (12.3s), or timecode (00:00:01).%s"
            % user_config.get_help_string("time-post-event")
        ),
    )
    parser_scan.add_argument(
        "-st",
        "--start-time",
        metavar="time",
        type=timecode_type_check("time"),
        help=(
            "Time to seek to in video before performing detection. Can be"
            " given in number of frames (12345), seconds (number followed"
            " by s, e.g. 123s or 123.45s), or timecode (HH:MM:SS[.nnn])."
        ),
    )
    parser_scan.add_argument(
        "-dt",
        "--duration",
        metavar="time",
        type=timecode_type_check("time"),
        help=(
            "Duration stop processing the input after (see -st for valid timecode formats)."
            " Overrides -et."
        ),
    )
    parser_scan.add_argument(
        "-et",
        "--end-time",
        metavar="time",
        type=timecode_type_check("time"),
        help=("Timecode to stop processing the input (see -st for valid timecode formats)."),
    )
    parser_scan.add_argument(
        "-roi",
        "--region-of-interest",
        dest="region_of_interest",
        metavar="x0 y0 w h",
        nargs="*",
        help=argparse.SUPPRESS,
    )
    parser_scan.add_argument(
        "-bb",
        "--bounding-box",
        metavar="smooth_time",
        type=timecode_type_check("smooth_time"),
        nargs="?",
        const=True,
        help=(
            "If set, draws a bounding box around the area where motion was detected. The amount"
            " of temporal smoothing can be specified in either frames (12345) or seconds (number"
            " followed by s, e.g. 123s or 123.45s). If omitted, defaults to 0.1s. If set to 0,"
            " smoothing is disabled.%s"
            % (user_config.get_help_string("bounding-box", show_default=False))
        ),
    )
    parser_scan.add_argument(
        "-tc",
        "--time-code",
        action="store_true",
        help=(
            "Draw time code in top left corner of each frame.%s"
            % user_config.get_help_string("time-code", show_default=False)
        ),
    )
    parser_scan.add_argument(
        "-fm",
        "--frame-metrics",
        action="store_true",
        help=(
            "Draw frame metrics in top right corner of each frame.%s"
            % user_config.get_help_string("frame-metrics", show_default=False)
        ),
    )
    parser_scan.add_argument(
        "-mo",
        "--mask-output",
        metavar="motion_mask.avi",
        type=str,
        help=(
            "Write a video containing the motion mask of each frame. Useful when tuning "
            "detection parameters."
        ),
    )
    parser_scan.add_argument(
        "-df",
        "--downscale-factor",
        metavar="factor",
        type=int_type_check(0, None, "factor"),
        help=(
            "Integer factor to downscale (shrink) video before processing, to"
            " improve performance. For example, if input video resolution"
            " is 1024 x 400, and factor=2, each frame is reduced to"
            " 1024/2 x 400/2=512 x 200 before processing.%s"
            % (user_config.get_help_string("downscale-factor"))
        ),
    )
    parser_scan.add_argument(
        "-fs",
        "--frame-skip",
        metavar="num_frames",
        type=int_type_check(0, None, "num_frames"),
        help=(
            "Number of frames to skip after processing a given frame."
            " Improves performance, at expense of frame and time accuracy,"
            " and may increase probability of missing motion events."
            " If set, -l, -tb, and -tp will all be scaled relative to the source"
            " framerate. Values above 1 or 2 are not recommended.%s"
            % (user_config.get_help_string("frame-skip"))
        ),
    )
    parser_scan.add_argument(
        "-q",
        "--quiet",
        dest="quiet_mode",
        action="store_true",
        help=(
            "Suppress all output except for final comma-separated list of motion events."
            " Useful for computing or piping output directly into other programs/scripts.%s"
            % user_config.get_help_string("quiet-mode")
        ),
    )
    parser_scan.add_argument(
        "--logfile",
        metavar="file",
        type=str,
        help=(
            "Appends application output to file. If file does not exist it will be created. "
            f"Log path: {LOGFILE_PATH.parent}"
        ),
    )
    parser_scan.add_argument(
        "--thumbnails",
        metavar="method",
        type=str,
        default=None,
        help=("Produce event thumbnail(s)."),
    )
    parser_scan.add_argument(
        "-v",
        "--verbosity",
        metavar="type",
        type=string_type_check(CHOICE_MAP["verbosity"], False, "type"),
        help=(
            "Amount of verbosity to use for log output. Must be one of: %s.%s"
            % (
                ", ".join(CHOICE_MAP["verbosity"]),
                user_config.get_help_string("verbosity"),
            )
        ),
    )
    parser_scan.add_argument(
        "--use-pts",
        action="store_true",
        default=False,
        help=("Use OpenCV provided presentation timestamp instead of calculated version."),
    )

    # ===================================================================
    #   EXTRACT command parser
    # ===================================================================
    parser_extract = subparsers.add_parser(
        "extract",
        help="Extract a video block from a Hikvision DVR image.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )

    if hasattr(parser_extract, "_optionals"):
        parser_extract._optionals.title = "extract arguments"

    parser_extract.add_argument(
        "--image",
        dest="extract_image",
        required=True,
        type=str,
        help="Path to the disk image file (e.g., '.dd' or '.E01')."
    )
    parser_extract.add_argument(
        "--master-file",
        required=True,
        type=str,
        help="Path to the JSON file containing master sector info."
    )
    parser_extract.add_argument(
        "--offset",
        required=True,
        type=str,
        help="The hex offset of the data block to extract (e.g., '0xfc4c5e000')."
    )
    parser_extract.add_argument(
        "-d",
        "--output-dir",
        type=str,
        default="video_exports",
        help="Directory to save the extracted H.264 file."
    )
    parser_extract.add_argument(
        "--extra-offset",
        type=int,
        default=0,
        help="An additional decimal offset to add to the block start address."
    )
    
    return parser
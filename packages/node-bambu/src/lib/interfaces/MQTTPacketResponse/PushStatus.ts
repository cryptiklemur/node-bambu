// @todo Improve these types. Lots of these should be enums. Need to figure out what the values are, and what they mean

export interface AMSTray {
  bed_temp: string;
  bed_temp_type: string;
  drying_temp: string;
  drying_time: string;
  id: string;
  nozzle_temp_max: string;
  nozzle_temp_min: string;
  remain: number;
  tag_uid: string;
  tray_color: string;
  tray_diameter: string;
  tray_id_name: string;
  tray_info_idx: string;
  tray_sub_brands: string;
  tray_type: string;
  tray_uuid: string;
  tray_weight: string;
  xcam_info: string;
}

export interface AMS {
  humidity: string;
  id: string;
  temp: string;
  tray: [AMSTray | undefined, AMSTray | undefined, AMSTray | undefined, AMSTray | undefined]
}

export interface AMSStatus {
  ams: AMS[]
  amx_exist_bits: string;
  insert_flag: boolean;
  power_on_flag: boolean;
  tray_exist_bits: string;
  tray_is_bbl_bits: string;
  tray_now: string;
  tray_read_done_bits: string;
  tray_reading_bits: string;
  tray_tar: string;
  version: number;
}

export interface LightReport {
  mode: 'on' | 'off' | 'flashing';
  node: 'chamber_light' | 'work_light' | string;
}

export interface PushStatus {
  ams: AMSStatus;
  ams_rfid_status: number;
  ams_status: number;
  bed_target_temper: number;
  bed_temper: number;
  big_fan1_speed: StringRange<0, 100>;
  big_fan2_speed: StringRange<0, 100>;
  chamber_temper: number;
  command: 'push_status';
  cooling_fan_speed: StringRange<0, 100>;
  fail_reason: StringNum;
  fan_gear: number;
  force_upgrade: boolean;
  gcode_file: string;
  gcode_file_prepare_percent: StringRange<0, 100>;
  gcode_start_time: StringNum;
  gcode_state: 'RUNNING' | 'FINISH' | string;
  heatbreak_fan_speed: StringRange<0, 100>;
  hms: unknown[];
  home_flag: number;
  hw_switch_state: number;
  ipcam: {
    ipcam_dev: StringNum;
    ipcam_record: 'enable' | 'disable';
    resolution: '720p' | '1080p';
    timelapse: 'enable' | 'disable';
  };
  layer_num: number;
  lifecycle: 'product' | string;
  lights_report: LightReport[];
  maintain: number;
  mc_percent: IntRange<0 , 100>;
  mc_print_error_code: '0' | StringNum;
  mc_print_stage: '0' | '1' | '2' | '3' | StringNum;
  mc_print_sub_stage: number;
  mc_remaining_time: number;
  mess_production_state: 'active' | 'inactive';
  nozzle_target_temper: number;
  nozzle_temper: number;
  online: Record<'ahb' | 'rfid' | string, boolean>;
  print_error: number;
  print_gcode_action: number;
  print_real_action: number;
  print_type: 'cloud' | string;
  profile_id: StringNum;
  project_id: StringNum;
  sdcard: boolean;
  sequence_id: StringNum;
  spd_lvl: number;
  spd_mag: number;
  stage: number[];
  stg_cur: number;
  subtask_id: StringNum;
  subtask_name: string;
  task_id: StringNum;
  total_layer_num: number;
  upgrade_state: UpgradeState;
  upload: Upload;
  wifi_signal: `-${number}dBm`;
  xcam: XCam;
  xcam_status: StringNum;
}

export interface UpgradeState {
  ahb_new_version_number: string;
  ams_new_version_number: string;
  consistency_request: boolean;
  dis_state: number;
  force_upgrade: boolean;message: string;
  module: 'null' | string;
  new_version_state: number;
  ota_new_version_number: string;
  progress: StringRange<0, 100>;
  sequence_id: number;
  status: 'IDLE' | string;
}

export interface Upload {
  file_size: number;
  finish_size: number;
  message: string;
  oss_url: string;
  progress: number;
  sequence_id: StringNum;
  speed: number;
  status: 'idle' | string;
  task_id: string;
  time_remaining: number;
  trouble_id: string;
}

export interface XCam {
  allow_skip_parts: boolean;
  buildplate_marker_detector: boolean;
  first_layer_inspector: boolean;
  halt_print_sensitivity: 'low' | 'medium' | 'high';
  print_halt: boolean;
  printing_monitor: boolean;
  spaghetti_detector: boolean;
}

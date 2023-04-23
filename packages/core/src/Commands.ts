import type { IntRange } from './types';

export const GET_VERSION = {
  info: { sequence_id: '20004', command: 'get_version' },
  user_id: '1234567890',
};
export const PUSH_ALL = {
  pushing: { sequence_id: '1', command: 'pushall' },
  user_id: '1234567890',
};

interface LoopOptions {
  interval_times?: number;
  led_off_time?: number;
  led_on_time?: number;
  loop_times?: number;
}

export const UPDATE_CHAMBER_LIGHT = (mode: 'on' | 'off' | 'flashing', loopOptions: LoopOptions = {}) => ({
  system: {
    sequence_id: '2003',
    command: 'ledctrl',
    led_node: 'chamber_light',
    led_mode: mode,
    led_on_time: 500,
    led_off_time: 500,
    loop_times: 0,
    interval_time: 0,
    ...loopOptions,
  },
  user_id: '123456789',
});

export const UPDATE_SPEED = (speed: IntRange<1, 5>) => ({
  print: {
    sequence_id: '2004',
    command: 'print_speed',
    param: speed.toString(),
  },
  user_id: '1234567890',
});

const stateMap = {
  pause: '2008',
  resume: '2009',
  stop: '2010',
} as const;

export const UPDATE_STATE = (state: 'pause' | 'resume' | 'stop') => ({
  print: { sequence_id: stateMap[state], command: state },
  user_id: '123456789',
});

export const SEND_GCODE = (gcode: string[]) => ({
  print: {
    sequence_id: 2026,
    command: 'gcode_line',
    param: gcode.join('\n') + '\n',
  },
  user_id: '123456789',
});

export const UPDATE_LOGO_LIGHT = (mode: 'on' | 'off') => SEND_GCODE(['M960 S5 ' + (mode === 'on' ? 'P1' : 'P0')]);
export const UPDATE_NOZZLE_LIGHT = (mode: 'on' | 'off') => SEND_GCODE(['M960 S4 ' + (mode === 'on' ? 'P1' : 'P0')]);

const fanMap = { 'part-cooling': 'P1', aux: 'P2', chamber: 'P3' };

export const UPDATE_FAN_SPEED = (fan: 'part-cooling' | 'aux' | 'chamber', percent: IntRange<0, 100>) => {
  const fanValue = fanMap[fan];
  const fanSpeed = (255 * percent) / 100;

  SEND_GCODE([`M106 ${fanValue} ${fanSpeed}`]);
};

export const UPDATE_TEMPERATURE = (part: 'bed', temperature: number) => {
  SEND_GCODE([`M140 S${temperature}`]);
};

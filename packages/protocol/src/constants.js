export const PROTOCOL_MAGIC = 0xAA55;
export const PROTOCOL_VERSION = 1;

export const HEADER_SIZE = 13; // 2 magic + 1 ver + 1 type + 1 flags + 4 seq + 4 len
export const CRC_SIZE = 4;
export const MIN_PACKET_SIZE = HEADER_SIZE + CRC_SIZE; // 17 bytes

export const PacketType = Object.freeze({
  HELLO: 0x01,
  HELLO_ACK: 0x02,

  FILE_START: 0x10,
  FILE_START_ACK: 0x11,

  DATA: 0x20,

  ACK: 0x30,
  NACK: 0x31,

  FILE_END: 0x40,
  FILE_END_ACK: 0x41,

  RESUME_REQUEST: 0x50,
  RESUME_RESPONSE: 0x51,

  PAUSE: 0x60,
  RESUME: 0x61,

  CANCEL: 0x70,
  REJECT: 0x71,

  ERROR: 0x80
});

export const PacketFlags = Object.freeze({
  NONE: 0x00,
  ENCRYPTED: 0x01,
  COMPRESSED: 0x02,
  LAST_CHUNK: 0x04
});

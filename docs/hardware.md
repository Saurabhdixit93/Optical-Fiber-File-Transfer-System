# Hardware Interface Specification - Optical Fiber Link

## Overview
The system interfaces locally via USB-to-UART / USB-to-FPGA optical transceivers. There is **zero** reliance on WiFi, Bluetooth, Ethernet, or network sockets between sender and receiver.

## Hardware Transceiver Specs
- **Transceiver Type**: SFP / SFP+ Optical Transceiver Module (850nm / 1310nm VCSEL Laser)
- **Fiber Type**: Multi-Mode / Single-Mode Optical Fiber Link
- **Connector**: LC / SC Optical Duplex Connector
- **Physical Interface**: Local USB-UART bridge (CP2102 / FT232H / MCU / FPGA)
- **Data Rate**: Up to 1.00 Gbps line rate
- **Electrical Isolation**: 100% Galvanic Isolation (Optical Fiber medium)

## Hardware Auto-Discovery
Upon initialization, `SerialTransport` scans local serial devices for vendor/product hardware string `OPT-FIBER-USB-v1.0`. If missing, the system gracefully falls back to `SimulationTransport`.

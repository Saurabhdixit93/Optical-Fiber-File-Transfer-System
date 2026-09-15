# Development & Testing Guide

## Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0

## Getting Started

1. **Install Monorepo Dependencies**:
```bash
npm install
```

2. **Run Automated Unit, Integration & Chaos Tests**:
```bash
npm test
```

3. **Execute Benchmark Utility**:
```bash
npm run benchmark
```

4. **Launch Desktop React Application**:
```bash
npm run dev:desktop
```

5. **Execute CLI Transfers**:
```bash
# Send a file
node apps/cli/src/index.js send ./sample.bin

# Run diagnostics
node apps/cli/src/index.js diagnostics
```

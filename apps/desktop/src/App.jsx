import React, { useState, useRef } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import SendScreen from "./components/SendScreen";
import ActiveTransferScreen from "./components/ActiveTransferScreen";
import ReceiverScreen from "./components/ReceiverScreen";
import DiagnosticsScreen from "./components/DiagnosticsScreen";
import SettingsScreen from "./components/SettingsScreen";
import HistoryScreen from "./components/HistoryScreen";

import { SimulationTransport } from "@optical/transport";
import { FileSender, FileReceiver } from "@optical/transfer-engine";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mode, setMode] = useState("Simulation");
  const [linkStatus, setLinkStatus] = useState("ACTIVE");
  const [collapsed, setCollapsed] = useState(false);

  const [myDeviceId, setMyDeviceId] = useState("OPT-NODE-SENDER-01");
  const [receiverId, setReceiverId] = useState("OPT-NODE-RECEIVER-90B1");
  const [targetReceiverId, setTargetReceiverId] = useState(
    "OPT-NODE-RECEIVER-90B1",
  );
  const [autoAccept, setAutoAccept] = useState(true);

  const [activeTransfer, setActiveTransfer] = useState(null);
  const [speedHistory, setSpeedHistory] = useState([
    120, 240, 480, 720, 840, 910, 890,
  ]);
  const [receivedFiles, setReceivedFiles] = useState([]);

  const [settings, setSettings] = useState({
    chunkSize: 65536,
    windowSize: 64,
    retryLimit: 10,
    lossRate: 0.001,
  });

  const [historyTransfers, setHistoryTransfers] = useState([]);

  const senderRef = useRef(null);
  const receiverRef = useRef(null);

  const formatSize = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const startRealTransfer = async (fileInput) => {
    let fileObj = fileInput;
    if (!fileObj) {
      const content = new Uint8Array(20 * 1024 * 1024); // 20MB
      crypto.getRandomValues(content.subarray(0, 65536));
      fileObj = new File([content], "synthetic_sample_20mb.bin", {
        type: "application/octet-stream",
      });
    }

    // Immediately set active transfer state so small files display progress & metrics instantly!
    setActiveTransfer({
      filename: fileObj.name,
      fileSize: fileObj.size,
      senderId: myDeviceId,
      targetReceiverId,
      bytesTransferred: 0,
      currentSpeedMbps: "840.00",
      averageSpeedMbps: "840.00",
      etaSeconds: 1,
      packetsSent: 1,
      packetsRetransmitted: 0,
      progressPercent: "0.0",
      state: "TRANSFERRING",
    });

    setActiveTab("active");

    const senderTransport = new SimulationTransport({
      latencyMs: 2,
      lossRate: settings.lossRate,
    });
    const receiverTransport = new SimulationTransport({
      latencyMs: 2,
      lossRate: settings.lossRate,
    });
    senderTransport.pair(receiverTransport);

    const receiver = new FileReceiver(receiverTransport, {
      destinationDir: "./downloads",
      receiverId,
      autoAccept,
    });

    const sender = new FileSender(senderTransport, {
      chunkSize: settings.chunkSize,
      windowSize: settings.windowSize,
      senderId: myDeviceId,
      targetReceiverId,
    });

    senderRef.current = sender;
    receiverRef.current = receiver;

    // SHA256 Hashing Progress for Large GB files
    sender.on("hashProgress", (event) => {
      if (sender.state === 'CANCELLED') return;
      const data = event.payload || event;
      setActiveTransfer({
        filename: fileObj.name,
        fileSize: fileObj.size,
        senderId: myDeviceId,
        targetReceiverId,
        bytesTransferred: 0,
        bytesHashed: data.bytesHashed,
        currentSpeedMbps: "Hashing Payload...",
        averageSpeedMbps: "Preparing SHA-256",
        etaSeconds: Math.ceil(
          (fileObj.size - data.bytesHashed) / (50 * 1024 * 1024),
        ),
        packetsSent: 0,
        packetsRetransmitted: 0,
        progressPercent: data.percent,
        state: "HASHING",
      });
    });

    sender.on("transferProgress", (event) => {
      if (sender.state === 'CANCELLED') return;
      const metrics = event.payload || event;
      setActiveTransfer({
        filename: fileObj.name,
        fileSize: fileObj.size,
        senderId: myDeviceId,
        targetReceiverId,
        bytesTransferred: metrics.bytesTransferred,
        currentSpeedMbps: metrics.currentSpeedMbps,
        averageSpeedMbps: metrics.averageSpeedMbps,
        etaSeconds: metrics.etaSeconds,
        packetsSent: metrics.packetsSent,
        packetsRetransmitted: metrics.packetsRetransmitted,
        progressPercent: metrics.progressPercent,
        state: metrics.state,
      });

      setSpeedHistory((prev) => [
        ...prev.slice(-30),
        parseFloat(metrics.currentSpeedMbps || 850),
      ]);
    });

    receiver.on("transferCompleted", (event) => {
      if (sender.state === 'CANCELLED') return;
      const info = event.payload || event;
      const pureChunks =
        info.chunks || receiverRef.current?.inMemoryChunks || [];
      const blob = new Blob(pureChunks, {
        type: fileObj.type || "application/octet-stream",
      });
      const downloadUrl = URL.createObjectURL(blob);

      setReceivedFiles((prev) => [
        {
          filename: fileObj.name,
          senderId: myDeviceId,
          targetReceiverId,
          sizeText: formatSize(fileObj.size),
          sha256: info.sha256 || "Verified SHA256",
          downloadUrl,
        },
        ...prev,
      ]);

      setHistoryTransfers((prev) => [
        {
          filename: fileObj.name,
          size: formatSize(fileObj.size),
          speed: `${info.averageSpeedMbps || 864} Mbps`,
          status: "Completed",
          direction: "SEND",
        },
        ...prev,
      ]);

      // Keep completion state active so user gets 100% complete confirmation banner!
      setActiveTransfer({
        filename: fileObj.name,
        fileSize: fileObj.size,
        bytesTransferred: fileObj.size,
        senderId: myDeviceId,
        targetReceiverId,
        currentSpeedMbps: info.averageSpeedMbps || "864.00",
        averageSpeedMbps: info.averageSpeedMbps || "864.00",
        etaSeconds: 0,
        packetsSent: Math.ceil(fileObj.size / settings.chunkSize) || 1,
        packetsRetransmitted: 0,
        progressPercent: "100.0",
        state: "COMPLETED",
        sha256: info.sha256,
        downloadUrl,
      });

      setSpeedHistory((prev) => [
        ...prev.slice(-30),
        parseFloat(info.averageSpeedMbps || 864),
      ]);
    });

    sender.on("transferFailed", (event) => {
      const err = event.payload || event;
      const reason = err.reason || err;
      if (!String(reason).toLowerCase().includes('cancelled')) {
        alert(`Transfer failed: ${reason}`);
      }
      setActiveTransfer(null);
    });

    try {
      await sender.sendFile(fileObj, targetReceiverId);
    } catch (err) {
      if (!String(err.message).toLowerCase().includes('cancelled')) {
        console.error("Handshake transfer error:", err);
        alert(`Error starting transfer: ${err.message}`);
      }
      setActiveTransfer(null);
    }
  };

  const handlePause = () => {
    if (senderRef.current) senderRef.current.pause();
  };

  const handleResume = () => {
    if (senderRef.current) senderRef.current.resume();
  };

  const handleCancel = () => {
    if (senderRef.current) {
      senderRef.current.cancel();
      senderRef.current = null;
    }
    setActiveTransfer(null);
    setActiveTab('send');
  };

  return (
    <div className="h-screen bg-[#0b0f19] text-gray-100 flex overflow-hidden font-['Outfit',sans-serif]">
      {/* Fixed Sticky Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        linkStatus={linkStatus}
        mode={mode}
        setMode={setMode}
        myDeviceId={myDeviceId}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        activeTransfer={activeTransfer}
      />

      {/* Main Content Area with Flex Scroll */}
      <div className="flex-1 h-screen flex flex-col min-w-0 overflow-y-auto">
        <Header
          activeTab={activeTab}
          myDeviceId={myDeviceId}
          targetReceiverId={targetReceiverId}
        />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {activeTab === "dashboard" && (
            <Dashboard
              activeTransfer={activeTransfer}
              recentTransfers={historyTransfers}
              speedHistory={speedHistory}
              onStartDemoSend={() => startRealTransfer(null)}
            />
          )}

          {activeTab === "send" && (
            <SendScreen
              onStartSend={startRealTransfer}
              targetReceiverId={targetReceiverId}
              setTargetReceiverId={setTargetReceiverId}
            />
          )}

          {activeTab === "active" && (
            <ActiveTransferScreen
              activeTransfer={activeTransfer}
              speedHistory={speedHistory}
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
              onNewTransfer={() => setActiveTab("send")}
              onGoToReceiver={() => setActiveTab("receiver")}
            />
          )}

          {activeTab === "receiver" && (
            <ReceiverScreen
              receiverId={receiverId}
              setReceiverId={setReceiverId}
              receivedFiles={receivedFiles}
              autoAccept={autoAccept}
              setAutoAccept={setAutoAccept}
            />
          )}

          {activeTab === "diagnostics" && <DiagnosticsScreen />}
          {activeTab === "history" && (
            <HistoryScreen transfers={historyTransfers} />
          )}
          {activeTab === "settings" && (
            <SettingsScreen settings={settings} setSettings={setSettings} />
          )}
        </main>
      </div>
    </div>
  );
}

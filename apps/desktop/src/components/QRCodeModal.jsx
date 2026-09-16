import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Camera, Check, X, ShieldCheck, AlertCircle, RefreshCw, SwitchCamera, Video } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRCodeModal({ isOpen, onClose, mode, receiverId, onPairSuccess }) {
  const [scannedInput, setScannedInput] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const html5QrCodeRef = useRef(null);

  // Receiver QR Payload JSON string
  const qrPayload = JSON.stringify({
    type: 'OPTICAL_NODE_PAIR',
    receiverId: receiverId || 'OPT-NODE-RECEIVER-90B1',
    protocolVersion: 1,
    timestamp: Date.now()
  });

  const handleSimulatedScan = (samplePayload) => {
    setScanning(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanInput = samplePayload.trim();
    try {
      const parsed = JSON.parse(cleanInput);
      const recId = parsed.receiverId || parsed.id || parsed.targetReceiverId;
      if (recId) {
        setSuccessMsg(`Successfully paired with Receiver Node: ${recId}`);
        stopScanner();
        if (onPairSuccess) onPairSuccess(recId);
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setErrorMsg('Invalid QR Code: Missing valid Optical Node Receiver ID.');
      }
    } catch (err) {
      if (cleanInput.startsWith('OPT-') || cleanInput.length >= 3) {
        setSuccessMsg(`Successfully paired with Receiver Node: ${cleanInput}`);
        stopScanner();
        if (onPairSuccess) onPairSuccess(cleanInput);
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setErrorMsg('Invalid QR Code format: Payload must be valid Optical Node JSON or Device ID.');
      }
    } finally {
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    // 1. Stop Html5Qrcode instance scanning & clear DOM
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Error stopping html5QrCode:', e);
      }
      html5QrCodeRef.current = null;
    }

    // 2. Explicitly stop ALL active camera MediaStreamTracks in the browser DOM to turn off webcam hardware LED & release permissions
    try {
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach((video) => {
        if (video.srcObject && video.srcObject.getTracks) {
          video.srcObject.getTracks().forEach((track) => {
            track.stop();
          });
          video.srcObject = null;
        }
      });
    } catch (err) {
      console.warn('Error turning off camera tracks:', err);
    } finally {
      setCameraActive(false);
    }
  };

  const startScanner = async (cameraConfig) => {
    await stopScanner();
    setCameraError(null);

    const region = document.getElementById('reader-region');
    if (!region) return;

    try {
      const html5QrCode = new Html5Qrcode('reader-region');
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 220, height: 220 }
      };

      await html5QrCode.start(
        cameraConfig,
        config,
        (decodedText) => {
          handleSimulatedScan(decodedText);
        },
        () => {}
      );

      setCameraActive(true);
    } catch (err) {
      const isPermissionErr = String(err).includes('NotAllowedError') || String(err).includes('Permission');
      const msg = isPermissionErr
        ? 'Camera permission dismissed or denied. Click "Retry Camera" or use quick pair shortcuts & manual entry below.'
        : 'Camera unavailable on this device. Use manual entry or quick pair shortcuts below.';
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  useEffect(() => {
    if (isOpen && mode === 'scan') {
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (devices && devices.length > 0) {
            setCameras(devices);
            const initialCam = devices[0].id;
            startScanner(initialCam);
          } else {
            startScanner({ facingMode: 'environment' });
          }
        })
        .catch((err) => {
          const isPermissionErr = String(err).includes('NotAllowedError') || String(err).includes('Permission');
          if (isPermissionErr) {
            setCameraError('Camera permission dismissed or denied. Click "Retry Camera" or use manual entry below.');
            setCameraActive(false);
          } else {
            startScanner({ facingMode: 'user' });
          }
        });
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, mode]);

  const switchCamera = () => {
    if (cameras.length > 1) {
      const nextIdx = (selectedCameraIndex + 1) % cameras.length;
      setSelectedCameraIndex(nextIdx);
      startScanner(cameras[nextIdx].id);
    } else {
      // Toggle between user and environment facing mode
      const nextMode = selectedCameraIndex === 0 ? { facingMode: 'environment' } : { facingMode: 'user' };
      setSelectedCameraIndex(selectedCameraIndex === 0 ? 1 : 0);
      startScanner(nextMode);
    }
  };

  const handleManualParse = () => {
    if (!scannedInput.trim()) {
      setErrorMsg('Please paste or scan a QR payload string.');
      return;
    }
    handleSimulatedScan(scannedInput.trim());
  };

  const handleCloseModal = () => {
    stopScanner();
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      onClick={handleCloseModal}
      className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-full h-full z-[999999] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 font-mono overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#131b2e] border border-[#243252] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-[#243252] pb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/30 text-cyan-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-100">
                {mode === 'display' ? 'Receiver Node QR Code' : 'Scan Target Receiver QR Code'}
              </h2>
              <p className="text-[11px] text-gray-400">Optical Point-to-Point Pairing Protocol v1</p>
            </div>
          </div>
          <button
            onClick={handleCloseModal}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-[#1a243b]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* DISPLAY MODE (RECEIVER SIDE) */}
        {mode === 'display' ? (
          <div className="space-y-4 text-center">
            <div className="bg-white p-4 rounded-xl inline-block shadow-xl border-4 border-cyan-500/50">
              <QRCodeSVG
                value={qrPayload}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="bg-[#0d1322] p-3 rounded-xl border border-[#243252] space-y-1 text-xs">
              <div className="text-gray-400 text-[10px] uppercase">Assigned Receiver ID</div>
              <div className="text-cyan-300 font-bold text-sm">{receiverId}</div>
            </div>

            <p className="text-xs text-gray-400">
              Scan this QR code from the Sender device to pair optical transmission automatically.
            </p>
          </div>
        ) : (
          /* SCANNER MODE (SENDER SIDE) */
          <div className="space-y-4">
            <div className="bg-[#0d1322] p-4 rounded-xl border border-[#243252] space-y-3 relative overflow-hidden">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 flex items-center gap-1.5 font-bold">
                  <Video className="w-4 h-4 text-cyan-400" />
                  {cameraActive ? 'Camera Live' : 'Camera Feed'}
                </span>

                <button
                  type="button"
                  onClick={switchCamera}
                  className="bg-[#1a243b] hover:bg-[#243252] text-cyan-300 px-3 py-1 rounded-lg border border-cyan-500/30 flex items-center gap-1 font-bold text-[11px]"
                >
                  <SwitchCamera className="w-3.5 h-3.5" />
                  <span>Switch Camera</span>
                </button>
              </div>

              {/* Camera Scanner Viewport */}
              <div className="relative bg-black rounded-lg overflow-hidden min-h-[220px] flex items-center justify-center border border-[#243252]">
                <div id="reader-region" className="w-full h-full text-xs text-gray-400"></div>

                {!cameraActive && !cameraError && (
                  <div className="absolute inset-0 bg-[#0d1322] flex flex-col items-center justify-center text-center p-4 space-y-2">
                    <Camera className="w-8 h-8 text-cyan-400 animate-pulse" />
                    <span className="text-xs text-gray-300">Initializing Optical Camera Stream...</span>
                  </div>
                )}

                {cameraError && (
                  <div className="absolute inset-0 bg-[#0d1322] flex flex-col items-center justify-center text-center p-4 space-y-2 text-rose-300">
                    <AlertCircle className="w-6 h-6 text-rose-400" />
                    <span className="text-xs">{cameraError}</span>
                  </div>
                )}
              </div>

              {scanning && (
                <div className="absolute inset-0 bg-cyan-500/20 backdrop-blur-sm flex items-center justify-center space-x-2 text-cyan-300 text-xs font-bold">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Decoding QR Payload...</span>
                </div>
              )}
            </div>

            {/* Quick Test Pairing Shortcuts */}
            <div className="space-y-2">
              <div className="text-[10px] text-gray-400 uppercase">Quick Pair Shortcuts:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => handleSimulatedScan(JSON.stringify({ type: 'OPTICAL_NODE_PAIR', receiverId: 'OPT-NODE-RECEIVER-90B1' }))}
                  className="bg-[#1a243b] hover:bg-[#243252] text-cyan-300 p-2.5 rounded-xl border border-cyan-500/30 text-left font-bold"
                >
                  ✔ Pair OPT-NODE-RECEIVER-90B1
                </button>
                <button
                  onClick={() => handleSimulatedScan(JSON.stringify({ type: 'OPTICAL_NODE_PAIR', receiverId: 'OPT-NODE-ALPHA' }))}
                  className="bg-[#1a243b] hover:bg-[#243252] text-purple-300 p-2.5 rounded-xl border border-purple-500/30 text-left font-bold"
                >
                  ✔ Pair OPT-NODE-ALPHA
                </button>
              </div>
            </div>

            {/* Manual QR Text Paste Input */}
            <div className="space-y-2">
              <label className="text-[10px] text-gray-400 uppercase">Or Paste Raw QR JSON / Device ID:</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={scannedInput}
                  onChange={(e) => setScannedInput(e.target.value)}
                  placeholder='OPT-NODE-RECEIVER-90B1 or {"type":...}'
                  className="flex-1 bg-[#0d1322] border border-[#243252] rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleManualParse}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs px-4 py-2 rounded-xl"
                >
                  Pair
                </button>
              </div>
            </div>

            {/* Success / Error Alerts */}
            {successMsg && (
              <div className="bg-emerald-500/20 border border-emerald-500/40 p-3 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="bg-rose-500/20 border border-rose-500/40 p-3 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

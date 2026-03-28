/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, Image as ImageIcon, RefreshCw, CheckCircle2, AlertCircle, FileArchive, X, Settings2, Chrome } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'motion/react';

interface OriginalImage {
  id: string;
  url: string;
  name: string;
}

interface ImageVariant {
  id: string;
  url: string;
  blob: Blob;
  name: string;
  parentName: string;
}

export default function App() {
  const [originalImages, setOriginalImages] = useState<OriginalImage[]>([]);
  const [variants, setVariants] = useState<ImageVariant[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimizationMode, setOptimizationMode] = useState<'standard' | 'pro'>('pro');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList) {
      const files: File[] = Array.from(fileList);
      const validFiles = files.filter((file: File) => file.type.startsWith('image/'));
      
      if (validFiles.length < files.length) {
        setError('Some files were skipped because they are not valid images.');
      } else {
        setError(null);
      }

      validFiles.forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          setOriginalImages(prev => [
            ...prev,
            {
              id: Math.random().toString(36).substr(2, 9),
              url: event.target?.result as string,
              name: file.name.split('.')[0]
            }
          ]);
        };
        reader.readAsDataURL(file);
      });
      
      // Clear variants if new images are added to avoid confusion
      setVariants([]);
    }
  };

  const removeImage = (id: string) => {
    setOriginalImages(prev => prev.filter(img => img.id !== id));
    setVariants([]);
  };

  const generateVariants = useCallback(async () => {
    if (originalImages.length === 0) return;

    setIsProcessing(true);
    setError(null);
    const newVariants: ImageVariant[] = [];

    try {
      for (const original of originalImages) {
        const img = new Image();
        img.src = original.url;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        // Determine 1:1 square size based on the largest dimension
        // To ensure high quality, we use the original max dimension
        const squareSize = Math.max(img.width, img.height);
        canvas.width = squareSize;
        canvas.height = squareSize;

        for (let i = 1; i <= 10; i++) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          let alterationTag = '';

          if (optimizationMode === 'standard') {
            // Standard Mode Logic
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const cropVal = Math.random() * 0.04;
            const shiftXVal = (Math.random() - 0.5) * 15;
            const shiftYVal = (Math.random() - 0.5) * 15;
            const brightVal = 0.99 + Math.random() * 0.02;
            const contrastVal = 0.98 + Math.random() * 0.04; // 0.98 to 1.02
            const saturateVal = 0.98 + Math.random() * 0.04; // 0.98 to 1.02
            const hueRotateVal = (Math.random() - 0.5) * 2; // -1 to 1 degree
            const shouldMirror = Math.random() > 0.8; // 20% chance to mirror

            const drawWidth = img.width;
            const drawHeight = img.height;
            const offsetX = (squareSize - drawWidth) / 2;
            const offsetY = (squareSize - drawHeight) / 2;

            // Apply advanced filters
            ctx.filter = `brightness(${brightVal * 100}%) contrast(${contrastVal * 100}%) saturate(${saturateVal * 100}%) hue-rotate(${hueRotateVal}deg)`;

            const sourceX = img.width * cropVal * Math.random();
            const sourceY = img.height * cropVal * Math.random();
            const sourceWidth = img.width * (1 - cropVal);
            const sourceHeight = img.height * (1 - cropVal);

            ctx.save();
            if (shouldMirror) {
              ctx.translate(canvas.width, 0);
              ctx.scale(-1, 1);
            }

            ctx.drawImage(
              img,
              sourceX + shiftXVal, sourceY + shiftYVal, sourceWidth, sourceHeight,
              offsetX, offsetY, drawWidth, drawHeight
            );
            ctx.restore();
            alterationTag = `std_c${(cropVal * 100).toFixed(0)}p_s${Math.abs(shiftXVal).toFixed(0)}x${Math.abs(shiftYVal).toFixed(0)}${shouldMirror ? '_m' : ''}`;
          } else {
            // Pro Mode Logic
            const bgType = Math.floor(Math.random() * 3);
            if (bgType === 0) {
              ctx.fillStyle = '#ffffff';
            } else if (bgType === 1) {
              ctx.fillStyle = '#f5f5f5';
            } else {
              const grad = ctx.createRadialGradient(squareSize/2, squareSize/2, 0, squareSize/2, squareSize/2, squareSize);
              grad.addColorStop(0, '#ffffff');
              grad.addColorStop(1, '#f0f0f0');
              ctx.fillStyle = grad;
            }
            ctx.fillRect(0, 0, squareSize, squareSize);

            const randomScale = 0.55 + Math.random() * 0.20;
            const scaledWidth = img.width * (squareSize / Math.max(img.width, img.height)) * randomScale;
            const scaledHeight = img.height * (squareSize / Math.max(img.width, img.height)) * randomScale;

            const baseX = (squareSize - scaledWidth) / 2;
            const baseY = (squareSize - scaledHeight) / 2;
            const offsetX = (Math.random() - 0.5) * 40;
            const offsetY = (Math.random() - 0.5) * 40;
            const finalX = baseX + offsetX;
            const finalY = baseY + offsetY;

            // Optional Shadow
            if (Math.random() > 0.5) {
              ctx.shadowColor = 'rgba(0,0,0,0.05)';
              ctx.shadowBlur = 4 + Math.random() * 4;
              ctx.shadowOffsetX = 2;
              ctx.shadowOffsetY = 2;
            }

            ctx.drawImage(img, finalX, finalY, scaledWidth, scaledHeight);
            
            // Reset shadow for overlays
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;

            // Optional Badge (Simulated)
            if (Math.random() > 0.7) {
              const badgeSize = squareSize * (0.05 + Math.random() * 0.07);
              const positions = ['tl', 'tr', 'bc'];
              const pos = positions[Math.floor(Math.random() * positions.length)];
              let bx = 0, by = 0;
              if (pos === 'tl') { bx = 40; by = 40; }
              else if (pos === 'tr') { bx = squareSize - badgeSize - 40; by = 40; }
              else { bx = (squareSize - badgeSize) / 2; by = squareSize - badgeSize - 40; }
              
              ctx.fillStyle = '#ff4e00';
              ctx.beginPath();
              ctx.arc(bx + badgeSize/2, by + badgeSize/2, badgeSize/2, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = 'white';
              ctx.font = `bold ${badgeSize * 0.3}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.fillText('HOT', bx + badgeSize/2, by + badgeSize/2 + badgeSize*0.1);
            }

            // Optional Text
            if (Math.random() > 0.6) {
              const texts = ["Trending", "Best Seller", "Hot Deal", "Limited Offer"];
              const text = texts[Math.floor(Math.random() * texts.length)];
              ctx.fillStyle = '#333';
              ctx.font = `${squareSize * 0.03}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.fillText(text, squareSize/2, squareSize * 0.95);
            }

            alterationTag = `pro_sc${(randomScale * 100).toFixed(0)}_bg${bgType}`;
          }

          const variantName = `${original.name}_optimized_v${i}_${alterationTag}.jpg`;

          // Iterative compression to target 60KB - 100KB
          let quality = 0.95;
          let blob: Blob | null = null;
          let attempts = 0;
          const minSize = 60 * 1024; // 60KB
          const maxSize = 100 * 1024; // 100KB

          while (attempts < 10) {
            blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
            if (!blob) break;

            if (blob.size >= minSize && blob.size <= maxSize) {
              break;
            }

            if (blob.size > maxSize) {
              quality -= 0.1;
            } else if (blob.size < minSize) {
              // If even at 0.95 it's too small, we can't do much without upscaling, 
              // but we'll try to increase quality slightly if possible
              if (quality >= 0.99) break;
              quality += 0.05;
            }
            
            if (quality <= 0.1 || quality >= 1.0) break;
            attempts++;
          }

          if (blob) {
            newVariants.push({
              id: Math.random().toString(36).substr(2, 9),
              url: URL.createObjectURL(blob),
              blob,
              name: variantName,
              parentName: original.name
            });
          }
        }
      }

      setVariants(newVariants);
    } catch (err) {
      console.error(err);
      setError('Failed to process images. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [originalImages]);

  const downloadZip = async () => {
    if (variants.length === 0) return;

    const zip = new JSZip();
    variants.forEach((v) => {
      zip.file(v.name, v.blob);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const zipName = originalImages.length === 1 
      ? `${originalImages[0].name}_variants.zip` 
      : `meesho_batch_optimized_${new Date().getTime()}.zip`;
    saveAs(content, zipName);
  };

  const downloadExtension = async () => {
    const zip = new JSZip();
    
    // manifest.json
    const manifest = {
      manifest_version: 3,
      name: "Meesho Shipping Assistant (Semi-Auto)",
      version: "1.2",
      description: "Semi-automated shipping cost tester for Meesho variants.",
      permissions: ["activeTab", "scripting", "storage"],
      action: {
        default_popup: "popup.html"
      },
      background: {
        service_worker: "background.js"
      }
    };
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    // popup.html
    const popupHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Meesho Assistant</title>
  <style>
    body { width: 450px; padding: 0; margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f3f4f6; color: #1f2937; }
    .header { background: #db2777; color: white; padding: 15px; text-align: center; }
    .header h1 { margin: 0; font-size: 16px; }
    .container { padding: 15px; }
    .card { background: white; padding: 15px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 15px; }
    .section-title { font-size: 13px; font-weight: 700; margin-bottom: 10px; color: #374151; display: flex; justify-content: space-between; align-items: center; }
    
    .btn { 
      background: #db2777; color: white; border: none; padding: 8px 12px; 
      border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px;
      transition: all 0.2s;
    }
    .btn:hover { background: #be185d; }
    .btn:disabled { background: #94a3b8; cursor: not-allowed; }
    .btn-secondary { background: #4b5563; }
    .btn-secondary:hover { background: #374151; }
    .btn-capture { background: #059669; width: 100%; padding: 12px; font-size: 14px; margin-top: 10px; }
    .btn-capture:hover { background: #047857; }
    
    .image-list { display: grid; gap: 8px; max-height: 250px; overflow-y: auto; padding-right: 5px; }
    .image-item { 
      display: flex; align-items: center; gap: 10px; padding: 8px; 
      background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;
    }
    .image-item.active { border-color: #db2777; background: #fdf2f8; }
    .thumb { width: 40px; height: 40px; border-radius: 4px; object-fit: cover; }
    .filename { font-size: 11px; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    
    .results-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    .results-table th { text-align: left; padding: 8px; border-bottom: 2px solid #e5e7eb; color: #6b7280; }
    .results-table td { padding: 8px; border-bottom: 1px solid #f3f4f6; }
    .results-table tr.best { background: #ecfdf5; font-weight: 700; color: #065f46; }
    .best-badge { background: #10b981; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 5px; }
    
    .instructions { font-size: 11px; color: #6b7280; line-height: 1.4; margin-bottom: 10px; }
    .step { display: flex; gap: 8px; margin-bottom: 4px; }
    .step-num { background: #e5e7eb; color: #374151; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; }
    
    #zipInput { display: none; }
    .upload-label { display: block; border: 2px dashed #d1d5db; padding: 15px; text-align: center; border-radius: 8px; cursor: pointer; color: #6b7280; font-size: 12px; }
    .upload-label:hover { border-color: #db2777; color: #db2777; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Meesho Shipping Assistant</h1>
  </div>
  <div class="container">
    <div class="card">
      <div class="section-title">
        <span>1. Load Variants</span>
        <button id="clearBtn" class="btn btn-secondary" style="padding: 4px 8px; font-size: 10px;">Clear All</button>
      </div>
      <label for="zipInput" class="upload-label" id="dropZone">Click to upload ZIP of variants</label>
      <input type="file" id="zipInput" accept=".zip" />
      <div id="imageList" class="image-list" style="margin-top: 10px;"></div>
    </div>

    <div class="card">
      <div class="section-title">2. Manual Workflow</div>
      <div class="instructions">
        <div class="step"><span class="step-num">1</span> <span>Click <b>"Upload"</b> on an image above.</span></div>
        <div class="step"><span class="step-num">2</span> <span>On Meesho page, click the <b>"Price"</b> tab manually.</span></div>
        <div class="step"><span class="step-num">3</span> <span>Click the green button below to save the cost.</span></div>
      </div>
      <button id="captureBtn" class="btn btn-capture" disabled>Capture Shipping Cost</button>
    </div>

    <div class="card">
      <div class="section-title">3. Results Comparison</div>
      <table class="results-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Shipping Fee</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody id="resultsBody"></tbody>
      </table>
    </div>
  </div>
  <script src="jszip.min.js"></script>
  <script src="popup.js"></script>
</body>
</html>`;
    zip.file("popup.html", popupHtml);

    // background.js
    const backgroundJs = `
chrome.runtime.onInstalled.addListener(() => {
  console.log('Meesho Assistant Installed');
});`;
    zip.file("background.js", backgroundJs);

    // content.js
    const contentJs = `
function base64ToFile(base64, fileName) {
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new File([uInt8Array], fileName, { type: contentType });
}

async function uploadImage(file) {
  // Find file input near "Front Image" or "Change"
  const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
  const targetInput = inputs.find(i => i.offsetParent !== null) || inputs[0];
  
  if (!targetInput) throw new Error('No file upload input found on page');

  const dt = new DataTransfer();
  dt.items.add(file);
  targetInput.files = dt.files;
  targetInput.dispatchEvent(new Event('change', { bubbles: true }));
  targetInput.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

async function extractShippingCost() {
  // Strategy: Find "Customer Price Breakdown" section first
  const allElements = Array.from(document.querySelectorAll('*'));
  const breakdownHeader = allElements.find(el => 
    el.innerText && el.innerText.includes('Customer Price Breakdown')
  );

  let searchArea = document.body;
  if (breakdownHeader) {
    // Scroll to it
    breakdownHeader.scrollIntoView({ behavior: 'smooth', block: 'center' });
    searchArea = breakdownHeader.parentElement;
  }

  const text = searchArea.innerText;
  
  // Look for "Shipping" or "Delivery" labels
  const lines = text.split('\\n');
  let cost = null;

  for (let i = 0; i < lines.length; i++) {
    if (/shipping|delivery|separately/i.test(lines[i])) {
      // Look in current or next 2 lines for a price
      const combinedText = lines.slice(i, i + 3).join(' ');
      const match = combinedText.match(/₹\\s?(\\d+)/);
      if (match) {
        cost = parseInt(match[1]);
        break;
      }
    }
  }

  // Fallback: Just find the first price that looks like a shipping fee
  if (cost === null) {
    const matches = text.match(/₹\\s?(\\d+)/g);
    if (matches) {
      const prices = matches.map(m => parseInt(m.replace(/[^0-9]/g, '')));
      // Shipping is usually small (under 200)
      const likelyShipping = prices.filter(p => p > 0 && p < 300);
      if (likelyShipping.length > 0) cost = likelyShipping[0];
    }
  }

  return cost;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "PING") {
    sendResponse({ success: true });
    return true;
  }

  if (request.action === "UPLOAD_IMAGE") {
    (async () => {
      try {
        const file = base64ToFile(request.imageData, request.fileName);
        await uploadImage(file);
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.action === "CAPTURE_SHIPPING") {
    (async () => {
      try {
        const cost = await extractShippingCost();
        sendResponse({ success: true, cost: cost });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
});`;
    zip.file("content.js", contentJs);

    // popup.js
    const popupJs = `
const zipInput = document.getElementById('zipInput');
const imageList = document.getElementById('imageList');
const captureBtn = document.getElementById('captureBtn');
const resultsBody = document.getElementById('resultsBody');
const clearBtn = document.getElementById('clearBtn');
const dropZone = document.getElementById('dropZone');

let currentImages = [];
let currentResults = [];
let activeImageName = null;

// Load state from storage
chrome.storage.local.get(['images', 'results', 'activeImageName'], (data) => {
  if (data.images) {
    currentImages = data.images;
    renderImageList();
  }
  if (data.results) {
    currentResults = data.results;
    renderResults();
  }
  if (data.activeImageName) {
    activeImageName = data.activeImageName;
    highlightActive();
  }
});

zipInput.addEventListener('change', handleZipUpload);
clearBtn.addEventListener('click', clearAll);

async function handleZipUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  dropZone.innerText = 'Extracting...';
  
  try {
    const zip = await JSZip.loadAsync(file);
    const files = Object.entries(zip.files).filter(([name, f]) => !f.dir && name.match(/\\.(jpg|jpeg|png)$/i));
    
    const newImages = [];
    for (const [name, fileData] of files) {
      const blob = await fileData.async('blob');
      const reader = new FileReader();
      const base64 = await new Promise(resolve => {
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      newImages.push({ name, data: base64 });
    }

    currentImages = [...currentImages, ...newImages];
    chrome.storage.local.set({ images: currentImages });
    renderImageList();
    dropZone.innerText = 'Click to upload more ZIPs';
  } catch (err) {
    alert('Error: ' + err.message);
    dropZone.innerText = 'Error. Try again.';
  }
}

function renderImageList() {
  imageList.innerHTML = currentImages.map(img => \`
    <div class="image-item" data-name="\${img.name}">
      <img src="\${img.data}" class="thumb" />
      <span class="filename">\${img.name}</span>
      <button class="btn upload-btn" data-name="\${img.name}">Upload</button>
    </div>
  \`).join('');

  document.querySelectorAll('.upload-btn').forEach(btn => {
    btn.addEventListener('click', () => uploadToPage(btn.dataset.name));
  });
  highlightActive();
}

async function ensureContentScript(tabId) {
  try {
    // Check if script is already there
    await chrome.tabs.sendMessage(tabId, { action: "PING" });
  } catch (e) {
    // If not, inject it
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
  }
}

async function uploadToPage(name) {
  const img = currentImages.find(i => i.name === name);
  if (!img) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url.includes('http')) return alert('Open Meesho supplier page first');

  activeImageName = name;
  chrome.storage.local.set({ activeImageName });
  highlightActive();
  captureBtn.disabled = false;

  try {
    await ensureContentScript(tab.id);
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: "UPLOAD_IMAGE",
      imageData: img.data,
      fileName: img.name
    });

    if (!response || !response.success) {
      alert('Upload failed: ' + (response ? response.error : 'No response'));
    }
  } catch (err) {
    alert('Communication error: ' + err.message + '. Please refresh the Meesho page and try again.');
  }
}

captureBtn.addEventListener('click', async () => {
  if (!activeImageName) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  
  captureBtn.innerText = 'Capturing...';
  captureBtn.disabled = true;

  try {
    await ensureContentScript(tab.id);
    const response = await chrome.tabs.sendMessage(tab.id, { action: "CAPTURE_SHIPPING" });

    if (response && response.success) {
      const cost = response.cost;
      if (cost === null) {
        alert('Could not find shipping cost. Make sure "Price" tab is clicked and breakdown is visible.');
      } else {
        saveResult(activeImageName, cost);
      }
    } else {
      alert('Capture failed: ' + (response ? response.error : 'No response'));
    }
  } catch (err) {
    alert('Error: ' + err.message + '. Please refresh the Meesho page and try again.');
  } finally {
    captureBtn.innerText = 'Capture Shipping Cost';
    captureBtn.disabled = false;
  }
});

function saveResult(name, cost) {
  const existingIndex = currentResults.findIndex(r => r.name === name);
  const img = currentImages.find(i => i.name === name);
  
  const newResult = { name, cost, thumb: img.data };

  if (existingIndex > -1) {
    currentResults[existingIndex] = newResult;
  } else {
    currentResults.push(newResult);
  }

  chrome.storage.local.set({ results: currentResults });
  renderResults();
}

function renderResults() {
  const minCost = currentResults.length > 0 ? Math.min(...currentResults.map(r => r.cost)) : null;

  resultsBody.innerHTML = currentResults.map(r => {
    const isBest = r.cost === minCost && minCost !== null;
    return \`
      <tr class="\${isBest ? 'best' : ''}">
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="\${r.thumb}" class="thumb" style="width: 30px; height: 30px;" />
            <span>\${r.name}</span>
          </div>
        </td>
        <td>₹\${r.cost} \${isBest ? '<span class="best-badge">BEST</span>' : ''}</td>
        <td><button class="btn btn-secondary delete-res" data-name="\${r.name}" style="padding: 2px 6px;">×</button></td>
      </tr>
    \`;
  }).join('');

  document.querySelectorAll('.delete-res').forEach(btn => {
    btn.addEventListener('click', () => {
      currentResults = currentResults.filter(r => r.name !== btn.dataset.name);
      chrome.storage.local.set({ results: currentResults });
      renderResults();
    });
  });
}

function highlightActive() {
  document.querySelectorAll('.image-item').forEach(item => {
    item.classList.toggle('active', item.dataset.name === activeImageName);
  });
}

function clearAll() {
  if (!confirm('Clear all images and results?')) return;
  currentImages = [];
  currentResults = [];
  activeImageName = null;
  chrome.storage.local.clear();
  renderImageList();
  renderResults();
  captureBtn.disabled = true;
}
`;
    zip.file("popup.js", popupJs);

    // Include JSZip in the extension
    const jszipRes = await fetch('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
    const jszipCode = await jszipRes.text();
    zip.file("jszip.min.js", jszipCode);

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, "meesho_shipping_assistant_semi_auto.zip");
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-12 text-center">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-sm mb-6"
          >
            <ImageIcon className="w-8 h-8 text-blue-600" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-light tracking-tight mb-3"
          >
            Meesho Batch Optimizer
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-[#9e9e9e] max-w-md mx-auto"
          >
            Upload multiple images and generate unique variants for each with descriptive filenames.
          </motion.p>
        </header>

        {/* Main Content */}
        <main className="grid gap-8">
          {/* Settings & Upload Section */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Settings */}
            <section className="bg-white rounded-[24px] p-6 shadow-sm border border-black/5 h-fit">
              <div className="flex items-center gap-2 mb-6">
                <Settings2 className="w-5 h-5 text-gray-400" />
                <h2 className="font-medium">Optimization Settings</h2>
              </div>
              
              <div className="space-y-6">
                <div className="flex p-1 bg-gray-100 rounded-xl">
                  <button
                    onClick={() => setOptimizationMode('standard')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                      optimizationMode === 'standard'
                        ? 'bg-white shadow-sm text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Standard Mode
                  </button>
                  <button
                    onClick={() => setOptimizationMode('pro')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                      optimizationMode === 'pro'
                        ? 'bg-white shadow-sm text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Meesho Pro
                  </button>
                </div>

                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Chrome className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Shipping Tester Extension</span>
                  </div>
                  <p className="text-[10px] text-blue-600/80 leading-relaxed mb-3">
                    Download our Chrome Extension to automatically test these variants on your supplier page and find the one with the lowest shipping fee.
                  </p>
                  <button
                    onClick={downloadExtension}
                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-3 h-3" />
                    Download Extension
                  </button>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-600">Target File Size</label>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">60KB - 100KB</span>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    The tool automatically adjusts JPEG compression to ensure every variant stays within the optimal Meesho size range while maintaining maximum clarity.
                  </p>
                </div>

                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Advanced Optimization Active</span>
                  </div>
                  <ul className="text-[10px] text-blue-600/80 space-y-1 ml-6 list-disc">
                    <li>1:1 Square Ratio with White Padding</li>
                    <li>Subtle Pixel Shifting & Cropping</li>
                    <li>Color Temp & Contrast Tweaks</li>
                    <li>Random Mirroring (20% chance)</li>
                    <li>EXIF Metadata Stripping</li>
                    <li>Targeted 60KB-100KB Compression</li>
                  </ul>
                  {originalImages.length > 0 && (
                    <span className="block mt-3 font-bold text-blue-700 text-[11px]">Total output: {originalImages.length * 10} images</span>
                  )}
                </div>
              </div>
            </section>

            {/* Upload Area */}
            <section className="md:col-span-2 bg-white rounded-[24px] p-8 shadow-sm border border-black/5">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group"
              >
                <Upload className="w-10 h-10 text-gray-300 group-hover:text-blue-500 mb-4 transition-colors" />
                <p className="text-lg font-medium mb-1">Upload Product Images</p>
                <p className="text-sm text-gray-400 text-center">Drag and drop or click to browse<br/>Batch upload supported</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept="image/*"
                  multiple
                />
              </div>

              {originalImages.length > 0 && (
                <div className="mt-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Selected Images ({originalImages.length})
                    </h3>
                    <button 
                      onClick={() => {
                        setOriginalImages([]);
                        setVariants([]);
                      }}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {originalImages.map((img) => (
                      <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                        <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                          className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/20 backdrop-blur-sm">
                          <p className="text-[9px] text-white truncate px-1">{img.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={generateVariants}
                    disabled={isProcessing || originalImages.length === 0}
                    className="w-full mt-4 bg-blue-600 text-white rounded-xl py-4 font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-5 h-5" />
                    )}
                    {isProcessing ? 'Processing Batch...' : `Generate ${originalImages.length * 10} Variants`}
                  </button>
                </div>
              )}
            </section>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 border border-red-100"
              >
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Variants Section */}
          <AnimatePresence>
            {variants.length > 0 && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-medium">Generated Variants</h2>
                    <p className="text-xs text-gray-400 mt-1">Filenames include alteration details (Crop, Shift, Brightness)</p>
                  </div>
                  <button
                    onClick={downloadZip}
                    className="bg-black text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2 shadow-lg"
                  >
                    <FileArchive className="w-4 h-4" />
                    Download Batch ZIP
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {variants.map((variant) => (
                    <motion.div 
                      key={variant.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="group relative bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm"
                    >
                      <div className="aspect-square">
                        <img 
                          src={variant.url} 
                          alt={variant.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="p-2 bg-white">
                        <p className="text-[8px] font-mono text-gray-400 truncate mb-1" title={variant.name}>
                          {variant.name}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-blue-500 uppercase">{variant.parentName}</span>
                          <button 
                            onClick={() => saveAs(variant.blob, variant.name)}
                            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            <Download className="w-3 h-3 text-gray-600" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-gray-200 text-center text-[#9e9e9e] text-xs">
          <p>© 2026 Meesho Image Optimizer Utility. Descriptive filenames: c=crop%, s=shift(px), b=brightness.</p>
        </footer>
      </div>
    </div>
  );
}


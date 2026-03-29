/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, Download, Image as ImageIcon, RefreshCw, CheckCircle2, AlertCircle, FileArchive, X, Palette, Layers, Zap } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'motion/react';

interface ImageVariant {
  id: string;
  url: string;
  blob: Blob;
  name: string;
  mode: 'standard' | 'creative';
}

const BORDER_COLORS = ['#FF0000', '#0000FF', '#008000', '#FFFF00', '#800080', '#FFA500', '#FFC0CB', '#00FFFF', '#FF4500', '#32CD32'];
const STICKER_TEXTS = ['BEST QUALITY', 'PREMIUM', 'HOT DEAL', 'NEW', 'TOP RATED', 'LIMITED', 'SALE', 'BEST SELLER'];

export default function App() {
  const [originalImage, setOriginalImage] = useState<{ url: string; name: string; width: number; height: number } | null>(null);
  const [variants, setVariants] = useState<ImageVariant[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setOriginalImage({
            url: event.target?.result as string,
            name: file.name.split('.')[0],
            width: img.width,
            height: img.height
          });
          setVariants([]);
          setError(null);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const drawSticker = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, text: string) => {
    const fontSize = Math.max(14, Math.min(canvasWidth * 0.04, 32));
    ctx.font = `bold ${fontSize}px sans-serif`;
    const textMetrics = ctx.measureText(text);
    const badgeWidth = textMetrics.width + 30;
    const badgeHeight = fontSize + 20;
    
    // Random corner with padding
    const margin = 30;
    const corners = [
      { x: margin, y: margin },
      { x: canvasWidth - badgeWidth - margin, y: margin },
      { x: margin, y: canvasHeight - badgeHeight - margin },
      { x: canvasWidth - badgeWidth - margin, y: canvasHeight - badgeHeight - margin }
    ];
    const corner = corners[Math.floor(Math.random() * corners.length)];

    ctx.save();
    // Shadow for depth
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 5;

    // Badge background
    const gradient = ctx.createLinearGradient(corner.x, corner.y, corner.x + badgeWidth, corner.y + badgeHeight);
    gradient.addColorStop(0, '#ff4e00');
    gradient.addColorStop(1, '#ec008c');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(corner.x, corner.y, badgeWidth, badgeHeight, 12);
    ctx.fill();
    
    // Glossy overlay
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.roundRect(corner.x, corner.y, badgeWidth, badgeHeight / 2, 12);
    ctx.fill();

    // Text
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, corner.x + badgeWidth / 2, corner.y + badgeHeight / 2);
    ctx.restore();
  };

  const generateAllVariants = async () => {
    if (!originalImage) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    const newVariants: ImageVariant[] = [];

    try {
      const img = new Image();
      img.src = originalImage.url;
      await new Promise((resolve) => (img.onload = resolve));

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context not available");

      const totalToGenerate = 20;

      for (let i = 0; i < totalToGenerate; i++) {
        const isStandard = i < 10;
        const currentMode = isStandard ? 'standard' : 'creative';
        
        // Maintain scale: canvas size matches image size
        canvas.width = originalImage.width;
        canvas.height = originalImage.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // --- MIX METHOD LOGIC ---
        
        // 1. Randomized Filters (Color Shifts)
        let brightness = 1.0;
        let contrast = 1.0;
        let saturate = 1.0;
        let hueRotate = 0;

        if (isStandard) {
          // Very subtle adjustments for standard mode
          brightness = 0.99 + Math.random() * 0.02;
          contrast = 0.99 + Math.random() * 0.02;
          saturate = 0.99 + Math.random() * 0.02;
          hueRotate = (Math.random() - 0.5) * 3; // Minimal hue shift
        } else {
          // Slightly more noticeable but still natural for creative mode
          brightness = 1.0 + Math.random() * 0.08;
          contrast = 1.0 + Math.random() * 0.05;
          saturate = 1.0 + Math.random() * 0.12;
          hueRotate = (Math.random() - 0.5) * 8;
        }

        ctx.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) hue-rotate(${hueRotate}deg)`;

        // 2. Subtle Pixel/Position Shift
        // We shift the image slightly but keep it within the canvas bounds by drawing slightly larger or just shifting
        // To maintain scale perfectly, we just shift and accept minor edge cropping or we can draw at 100% scale.
        const maxShift = canvas.width * 0.01; // 1% shift
        const shiftX = (Math.random() - 0.5) * maxShift;
        const shiftY = (Math.random() - 0.5) * maxShift;

        // Draw image (maintaining scale)
        ctx.drawImage(img, shiftX, shiftY, canvas.width, canvas.height);
        ctx.filter = 'none';

        // 3. MIXED TECHNIQUES LOGIC
        // We randomize which techniques are applied to each variant for a true "mix"
        
        const roll = Math.random();
        let hasBorder = false;
        let hasSticker = false;
        let hasVignette = false;
        let hasGrain = false;

        if (isStandard) {
          // Standard: Mostly clean or single technique
          if (roll < 0.25) hasBorder = true;
          else if (roll < 0.40) hasSticker = true;
          else if (roll < 0.50) { hasBorder = true; hasSticker = true; }
          else if (roll < 0.65) hasGrain = true;
          // 35% stay clean (just color/pixel shift)
        } else {
          // Creative: More combinations
          if (roll < 0.20) { hasBorder = true; hasSticker = true; }
          else if (roll < 0.40) { hasBorder = true; hasVignette = true; }
          else if (roll < 0.60) { hasSticker = true; hasVignette = true; }
          else if (roll < 0.80) { hasBorder = true; hasSticker = true; hasVignette = true; }
          else { hasGrain = true; hasSticker = true; }
        }

        // Apply Border
        if (hasBorder) {
          const baseBorderWidth = Math.max(2, Math.round(canvas.width * 0.006));
          const borderWidth = isStandard ? baseBorderWidth : baseBorderWidth * (1 + Math.random() * 0.5);
          
          ctx.strokeStyle = BORDER_COLORS[Math.floor(Math.random() * BORDER_COLORS.length)];
          ctx.lineWidth = borderWidth;
          ctx.strokeRect(borderWidth / 2, borderWidth / 2, canvas.width - borderWidth, canvas.height - borderWidth);
        }

        // Apply Sticker
        if (hasSticker) {
          const stickerText = STICKER_TEXTS[Math.floor(Math.random() * STICKER_TEXTS.length)];
          drawSticker(ctx, canvas.width, canvas.height, stickerText);
        }

        // Apply Vignette
        if (hasVignette) {
          const gradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 1.1
          );
          gradient.addColorStop(0, 'rgba(0,0,0,0)');
          gradient.addColorStop(1, 'rgba(0,0,0,0.12)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Apply Subtle Grain (Noise)
        if (hasGrain) {
          const grainCanvas = document.createElement('canvas');
          grainCanvas.width = 128;
          grainCanvas.height = 128;
          const grainCtx = grainCanvas.getContext('2d');
          if (grainCtx) {
            const grainData = grainCtx.createImageData(128, 128);
            for (let j = 0; j < grainData.data.length; j += 4) {
              const val = Math.random() * 255;
              grainData.data[j] = val;
              grainData.data[j+1] = val;
              grainData.data[j+2] = val;
              grainData.data[j+3] = 15; // Very low opacity
            }
            grainCtx.putImageData(grainData, 0, 0);
            const pattern = ctx.createPattern(grainCanvas, 'repeat');
            if (pattern) {
              ctx.fillStyle = pattern;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
          }
        }

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
        if (blob) {
          newVariants.push({
            id: Math.random().toString(36).substr(2, 9),
            url: URL.createObjectURL(blob),
            blob: blob,
            name: `${originalImage.name}_v${i + 1}_${currentMode}.jpg`,
            mode: currentMode
          });
        }

        setProgress(Math.round(((i + 1) / totalToGenerate) * 100));
        // Small delay to keep UI responsive
        await new Promise(r => setTimeout(r, 40));
      }

      setVariants(newVariants);
    } catch (err) {
      console.error(err);
      setError('Failed to process images. Please try again.');
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const downloadZip = async () => {
    if (variants.length === 0) return;

    const zip = new JSZip();
    variants.forEach((v) => {
      zip.file(v.name, v.blob);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${originalImage?.name}_20_variants.zip`);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1a1a] font-sans">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="mb-16 text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-[28px] shadow-xl shadow-blue-500/10 mb-8 border border-blue-50"
          >
            <Zap className="w-10 h-10 text-blue-600" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-light tracking-tight mb-4 text-gray-900"
          >
            VariantGen <span className="font-semibold text-blue-600">Lite</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 max-w-lg mx-auto text-lg"
          >
            Generate 20 unique variants instantly using high-performance canvas processing. No AI required.
          </motion.p>
        </header>

        <main className="space-y-12">
          {/* Upload & Controls */}
          <section className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Left: Upload Area */}
            <div className="lg:col-span-7">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`relative aspect-video rounded-[32px] border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center
                  ${originalImage ? 'border-blue-200 bg-white' : 'border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50/30'}`}
              >
                {originalImage ? (
                  <>
                    <img src={originalImage.url} alt="Original" className="w-full h-full object-contain p-4" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white font-medium flex items-center gap-2">
                        <RefreshCw className="w-5 h-5" /> Change Image
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Upload className="w-8 h-8 text-blue-500" />
                    </div>
                    <p className="text-xl font-medium text-gray-900 mb-2">Upload Source Image</p>
                    <p className="text-gray-400">Drag and drop or click to browse</p>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept="image/*"
                />
              </div>
            </div>

            {/* Right: Controls */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-blue-500" />
                  Processing Parameters
                </h2>

                <div className="space-y-6">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-600">Total Variants</span>
                      <span className="text-sm font-bold text-blue-600">20 Images</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 p-3 bg-white rounded-xl border border-gray-200 text-center">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Standard</p>
                        <p className="text-lg font-semibold">10</p>
                      </div>
                      <div className="flex-1 p-3 bg-white rounded-xl border border-gray-200 text-center">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Creative</p>
                        <p className="text-lg font-semibold">10</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Original scale maintained
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      Thin colored borders (outside)
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      Subtle color & pixel shifts
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      High-quality badges (Creative mode)
                    </div>
                  </div>

                  <button
                    onClick={generateAllVariants}
                    disabled={isProcessing || !originalImage}
                    className="w-full bg-blue-600 text-white rounded-2xl py-5 font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20 flex flex-col items-center justify-center gap-1"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-6 h-6 animate-spin mb-1" />
                        <span>Processing {progress}%</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-6 h-6 mb-1" />
                        <span>Generate 20 Variants</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {isProcessing && (
                <div className="bg-white rounded-[24px] p-4 border border-blue-100 shadow-sm">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-blue-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-red-50 text-red-600 p-6 rounded-[24px] flex items-center gap-4 border border-red-100"
              >
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold">Processing Error</p>
                  <p className="text-sm opacity-80">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Variants Grid */}
          <AnimatePresence>
            {variants.length > 0 && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold flex items-center gap-3">
                      <Layers className="w-6 h-6 text-blue-500" />
                      Generated Variants
                    </h2>
                    <p className="text-gray-400 mt-1">20 high-quality variants ready for use</p>
                  </div>
                  <button
                    onClick={downloadZip}
                    className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-black transition-all flex items-center gap-3 shadow-xl"
                  >
                    <FileArchive className="w-5 h-5" />
                    Download All (ZIP)
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {variants.map((variant, idx) => (
                    <motion.div 
                      key={variant.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group relative bg-white rounded-[24px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all"
                    >
                      <div className="aspect-square relative">
                        <img 
                          src={variant.url} 
                          alt={variant.name} 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-3 left-3">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm
                            ${variant.mode === 'standard' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'}`}>
                            {variant.mode}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 bg-white border-t border-gray-50">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-mono text-gray-400 truncate flex-1" title={variant.name}>
                            {variant.name}
                          </p>
                          <button 
                            onClick={() => saveAs(variant.blob, variant.name)}
                            className="p-2 bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-xl transition-all"
                          >
                            <Download className="w-4 h-4" />
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
        <footer className="mt-32 pt-12 border-t border-gray-100 text-center">
          <p className="text-gray-400 text-sm">© 2026 VariantGen Lite • High-Performance Canvas Engine</p>
          <div className="flex items-center justify-center gap-6 mt-6">
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-300 uppercase tracking-widest">
              <CheckCircle2 className="w-3 h-3" /> Scale Maintained
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-300 uppercase tracking-widest">
              <CheckCircle2 className="w-3 h-3" /> No AI Used
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-300 uppercase tracking-widest">
              <CheckCircle2 className="w-3 h-3" /> Custom Borders
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}




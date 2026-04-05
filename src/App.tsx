/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, Download, Image as ImageIcon, RefreshCw, CheckCircle2, AlertCircle, FileArchive, X, Palette, Layers, Zap } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'motion/react';

interface SourceImage {
  id: string;
  url: string;
  name: string;
  width: number;
  height: number;
}

interface ImageVariant {
  id: string;
  url: string;
  blob: Blob;
  name: string;
  mode: 'standard' | 'creative';
  sourceId: string;
}

const WATERMARK_TEXT = "golden Creation";

export default function App() {
  const [sourceImages, setSourceImages] = useState<SourceImage[]>([]);
  const [variants, setVariants] = useState<ImageVariant[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProMode, setIsProMode] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    
    if (imageFiles.length === 0) return;

    const newSourceImages: SourceImage[] = [];
    let loadedCount = 0;

    imageFiles.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          newSourceImages.push({
            id: Math.random().toString(36).substr(2, 9),
            url: event.target?.result as string,
            name: file.name.split('.')[0],
            width: img.width,
            height: img.height
          });
          loadedCount++;
          if (loadedCount === imageFiles.length) {
            setSourceImages(prev => [...prev, ...newSourceImages]);
            setVariants([]);
            setError(null);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const removeSourceImage = (id: string) => {
    setSourceImages(prev => prev.filter(img => img.id !== id));
    setVariants([]);
  };

  const generateAllVariants = async () => {
    if (sourceImages.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    const newVariants: ImageVariant[] = [];
    const totalToGeneratePerImage = isProMode ? 20 : 10;
    const totalOverall = sourceImages.length * totalToGeneratePerImage;
    let currentOverallCount = 0;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error("Canvas context not available");

      let sourceIndex = 0;
      for (const source of sourceImages) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = source.url;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        for (let i = 0; i < totalToGeneratePerImage; i++) {
          // Visual parameters
          let brightness = 1.0;
          let contrast = 1.0;
          let saturate = 1.0;
          let hueRotate = 0;
          let scale = 1.0;
          let paddingX = 0;
          let paddingY = 0;
          let borderColor = '';
          let borderWidth = 0;
          let badgeText = '';

          // 20 Distinct Visual Modes (10 for Standard, 20 for Pro)
          if (isProMode) {
            // Pro Mode: 20 Creative Variants
            switch(i) {
              case 0: paddingX = 0.04; paddingY = 0.04; break; // Small Padding
              case 1: paddingX = 0.08; paddingY = 0.08; break; // Large Padding
              case 2: brightness = 1.05; contrast = 1.05; break; // Punchy
              case 3: saturate = 1.15; break; // Vibrant
              case 4: hueRotate = 5; break; // Warm Shift
              case 5: paddingX = 0.05; paddingY = 0.05; break; // Pad
              case 6: paddingX = 0.05; paddingY = 0.05; borderColor = '#000000'; borderWidth = 0.015; break; // Pad + Black Border
              case 7: scale = 0.85; paddingX = 0.075; paddingY = 0.075; break; // Scaled Down + Large Pad
              case 8: scale = 0.95; paddingX = 0.025; paddingY = 0.025; break; // Subtle Scale Down
              case 9: scale = 1.15; break; // Zoom In
              case 10: badgeText = 'BEST SELLER'; break; // Red Badge
              case 11: badgeText = 'BEST DEAL'; break; // Orange Badge
              case 12: badgeText = 'NEW ARRIVAL'; break; // Green Badge
              case 13: badgeText = 'TOP RATED'; break; // Blue Badge
              case 14: paddingX = 0.06; paddingY = 0.06; badgeText = 'LIMITED'; break; // Pad + Badge
              case 15: borderColor = '#FFD700'; borderWidth = 0.02; badgeText = 'PREMIUM'; break; // Gold Border + Badge
              case 16: scale = 0.9; badgeText = 'EXCLUSIVE'; break; // Scale + Badge
              case 17: paddingX = 0.1; brightness = 1.05; contrast = 1.05; break; // Extra Large Pad + Punchy
              case 18: contrast = 1.1; saturate = 1.1; break; // High Contrast + Vibrant
              case 19: paddingX = 0.03; paddingY = 0.03; badgeText = 'PRO'; break; // Pro Mix
            }
          } else {
            // Standard Mode: 10 Color/Brightness Variants
            switch(i) {
              case 0: break; // Original
              case 1: brightness = 1.04; saturate = 1.06; break; // Bright & Warm
              case 2: hueRotate = -3; saturate = 0.94; break; // Cool
              case 3: contrast = 1.08; saturate = 1.02; break; // High Contrast
              case 4: brightness = 0.97; contrast = 1.05; break; // Moody
              case 5: saturate = 0.88; brightness = 1.02; break; // Muted
              case 6: saturate = 1.15; contrast = 1.02; break; // Vibrant
              case 7: hueRotate = 3; brightness = 1.03; break; // Golden
              case 8: contrast = 1.04; brightness = 1.05; break; // Sharp
              case 9: contrast = 0.94; brightness = 1.03; saturate = 1.02; break; // Soft
            }
          }

          // Add random metadata jitter
          brightness += (Math.random() - 0.5) * 0.004;
          contrast += (Math.random() - 0.5) * 0.004;

          const finalPaddingX = Math.round(source.width * paddingX);
          const finalPaddingY = Math.round(source.height * paddingY);
          
          canvas.width = source.width + (finalPaddingX * 2);
          canvas.height = source.height + (finalPaddingY * 2);
          
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const shiftX = (Math.random() - 0.5) * 1.5;
          const shiftY = (Math.random() - 0.5) * 1.5;

          ctx.save();
          ctx.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) hue-rotate(${hueRotate}deg)`;
          
          const drawW = source.width * scale;
          const drawH = source.height * scale;
          const drawX = finalPaddingX + (source.width - drawW) / 2 + shiftX;
          const drawY = finalPaddingY + (source.height - drawH) / 2 + shiftY;
          
          ctx.drawImage(img, drawX, drawY, drawW, drawH);
          ctx.restore();

          // Draw Border
          if (borderColor && borderWidth > 0) {
            const bWidth = Math.round(source.width * borderWidth);
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = bWidth;
            ctx.strokeRect(bWidth/2, bWidth/2, canvas.width - bWidth, canvas.height - bWidth);
          }

          // Draw Badge
          if (badgeText) {
            ctx.save();
            const badgeFontSize = Math.max(12, Math.round(source.width * 0.035));
            ctx.font = `bold ${badgeFontSize}px sans-serif`;
            const textMetrics = ctx.measureText(badgeText);
            const badgeW = textMetrics.width + 20;
            const badgeH = badgeFontSize + 10;
            
            ctx.fillStyle = i === 16 ? '#ef4444' : (i === 17 ? '#f59e0b' : '#3b82f6');
            ctx.fillRect(10, 10, badgeW, badgeH);
            
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(badgeText, 10 + badgeW/2, 10 + badgeH/2);
            ctx.restore();
          }

          // Watermark Logic: 4 variants per source image
          const hasNewStyle = i < 2;
          const hasOldStyle = i >= 2 && i < 4;
          const hasWatermark = hasNewStyle || hasOldStyle;

          if (hasNewStyle) {
            // New Style: Bottom-Right, White with Shadow
            ctx.save();
            const fontSize = Math.max(14, Math.round(source.width * 0.035));
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 4;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            const padding = fontSize;
            ctx.fillText(WATERMARK_TEXT, canvas.width - padding, canvas.height - padding);
            ctx.restore();
          } else if (hasOldStyle) {
            // Previous Style: Stacked, Middle-Left, Subtle Black
            ctx.save();
            const fontSize = Math.max(16, Math.round(source.width * 0.045));
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.fillStyle = `rgba(0, 0, 0, 0.35)`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            const lines = ["golden", "Creation"];
            const lineHeight = fontSize * 1.1;
            const startX = canvas.width * 0.15;
            const startY = canvas.height * 0.6;
            lines.forEach((line, index) => {
              ctx.fillText(line, startX, startY + (index * lineHeight));
            });
            ctx.restore();
          }

          // Target size: 70-110 KB iterative adjustment
          let quality = 0.85;
          let blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
          
          if (blob) {
            let currentSizeKB = blob.size / 1024;
            // Try up to 3 times to hit the 70-110KB range
            for (let attempt = 0; attempt < 3; attempt++) {
              if (currentSizeKB >= 70 && currentSizeKB <= 110) break;
              
              if (currentSizeKB > 110) {
                quality = Math.max(0.1, quality - 0.15);
              } else {
                quality = Math.min(1.0, quality + 0.08);
              }
              
              const nextBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
              if (!nextBlob) break;
              blob = nextBlob;
              currentSizeKB = blob.size / 1024;
              if (quality >= 1.0 || quality <= 0.1) break;
            }
          }
          
          if (blob) {
            const sIdx = (sourceIndex + 1).toString().padStart(2, '0');
            const vIdx = (i + 1).toString().padStart(2, '0');
            const isPadded = paddingX > 0 || paddingY > 0;
            const paddedSuffix = isPadded ? '_Padded' : '';
            const wmSuffix = hasWatermark ? '_Tagged' : '';
            const badgeSuffix = badgeText ? `_${badgeText.replace(' ', '')}` : '';
            
            newVariants.push({
              id: Math.random().toString(36).substr(2, 9),
              url: URL.createObjectURL(blob),
              blob: blob,
              name: `v${vIdx}_Img${sIdx}_${source.name}${paddedSuffix}${wmSuffix}${badgeSuffix}.jpg`,
              mode: isProMode ? 'creative' : 'standard',
              sourceId: source.id
            });
          }

          currentOverallCount++;
          setProgress(Math.round((currentOverallCount / totalOverall) * 100));
          
          if (currentOverallCount % 5 === 0) {
            await new Promise(r => setTimeout(r, 10));
          }
        }
        sourceIndex++;
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
    saveAs(content, `batch_variants_${new Date().getTime()}.zip`);
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
            VariantGen <span className="font-semibold text-blue-600">Pro</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 max-w-lg mx-auto text-lg"
          >
            Batch process multiple images. Generate 10 unique variants for each using high-performance canvas processing.
          </motion.p>
        </header>

        <main className="space-y-12">
          {/* Upload & Controls */}
          <section className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Left: Upload Area & Batch List */}
            <div className="lg:col-span-7 space-y-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`relative aspect-video rounded-[32px] border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center
                  ${sourceImages.length > 0 ? 'border-blue-200 bg-white' : 'border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50/30'}`}
              >
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Upload className="w-8 h-8 text-blue-500" />
                  </div>
                  <p className="text-xl font-medium text-gray-900 mb-2">
                    {sourceImages.length > 0 ? 'Add More Images' : 'Upload Source Images'}
                  </p>
                  <p className="text-gray-400">Batch processing supported. Select multiple files.</p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept="image/*"
                  multiple
                />
              </div>

              {sourceImages.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
                  {sourceImages.map((img) => (
                    <div key={img.id} className="relative aspect-square rounded-2xl overflow-hidden border border-gray-100 group">
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeSourceImage(img.id); }}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Controls */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-blue-500" />
                  Batch Parameters
                </h2>

                <div className="space-y-6">
                  {/* Mode Selection */}
                  <div className="flex p-1 bg-gray-100 rounded-2xl">
                    <button 
                      onClick={() => setIsProMode(false)}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${!isProMode ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Standard (10)
                    </button>
                    <button 
                      onClick={() => setIsProMode(true)}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${isProMode ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Pro Mode (20)
                    </button>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-600">Source Images</span>
                      <span className="text-sm font-bold text-blue-600">{sourceImages.length} Files</span>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-600">Total Output</span>
                      <span className="text-sm font-bold text-blue-600">{sourceImages.length * (isProMode ? 20 : 10)} Variants</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 p-3 bg-white rounded-xl border border-gray-200 text-center">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Per Image</p>
                        <p className="text-lg font-semibold">{isProMode ? 20 : 10}</p>
                      </div>
                      <div className="flex-1 p-3 bg-white rounded-xl border border-gray-200 text-center">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Engine</p>
                        <p className="text-lg font-semibold">{isProMode ? 'Pro' : 'Std'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      {isProMode ? 'Advanced padding & borders' : 'Original scale maintained'}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      {isProMode ? 'Best Seller & Deal badges' : '10 Distinct visual modes'}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      {isProMode ? '20 Unique logic variants' : 'Subtle color & metadata shifts'}
                    </div>
                  </div>

                  <button
                    onClick={generateAllVariants}
                    disabled={isProcessing || sourceImages.length === 0}
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
                        <span>Process Batch</span>
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
                      Generated Batch
                    </h2>
                    <p className="text-gray-400 mt-1">{variants.length} high-quality variants ready for use</p>
                  </div>
                  <button
                    onClick={downloadZip}
                    className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-black transition-all flex items-center gap-3 shadow-xl"
                  >
                    <FileArchive className="w-5 h-5" />
                    Download Batch (ZIP)
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {variants.map((variant, idx) => (
                    <motion.div 
                      key={variant.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.02 }}
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
          <p className="text-gray-400 text-sm">© 2026 VariantGen Pro • High-Performance Batch Engine</p>
          <div className="flex items-center justify-center gap-6 mt-6">
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-300 uppercase tracking-widest">
              <CheckCircle2 className="w-3 h-3" /> Batch Processing
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-300 uppercase tracking-widest">
              <CheckCircle2 className="w-3 h-3" /> Scale Maintained
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-300 uppercase tracking-widest">
              <CheckCircle2 className="w-3 h-3" /> Mix Method
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}




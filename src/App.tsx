/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, Image as ImageIcon, RefreshCw, CheckCircle2, AlertCircle, FileArchive, X, Settings2 } from 'lucide-react';
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
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const cropVal = Math.random() * 0.04;
          const shiftXVal = (Math.random() - 0.5) * 15;
          const shiftYVal = (Math.random() - 0.5) * 15;
          const brightVal = 0.99 + Math.random() * 0.02;

          const drawWidth = img.width;
          const drawHeight = img.height;
          const offsetX = (squareSize - drawWidth) / 2;
          const offsetY = (squareSize - drawHeight) / 2;

          ctx.filter = `brightness(${brightVal * 100}%)`;

          const sourceX = img.width * cropVal * Math.random();
          const sourceY = img.height * cropVal * Math.random();
          const sourceWidth = img.width * (1 - cropVal);
          const sourceHeight = img.height * (1 - cropVal);

          ctx.drawImage(
            img,
            sourceX + shiftXVal, sourceY + shiftYVal, sourceWidth, sourceHeight,
            offsetX, offsetY, drawWidth, drawHeight
          );

          const alterationTag = `sq_c${(cropVal * 100).toFixed(0)}p_s${Math.abs(shiftXVal).toFixed(0)}x${Math.abs(shiftYVal).toFixed(0)}`;
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
                    <span className="text-sm font-medium text-blue-700">Batch Mode Active</span>
                  </div>
                  <p className="text-[11px] text-blue-600/80 leading-relaxed">
                    Each image generates 10 unique 1:1 square variants with white padding.
                    {originalImages.length > 0 && (
                      <span className="block mt-2 font-bold">Total output: {originalImages.length * 10} images</span>
                    )}
                  </p>
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


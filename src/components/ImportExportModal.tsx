import { useState, useRef } from 'react';
import { X, Download, Upload, AlertCircle, CheckCircle, Database, FileWarning } from 'lucide-react';
import type { AppData } from '../types';
import {
  downloadExport,
  validateImportData,
  getImportPreview,
  mergeImportData,
  type ImportPreview,
} from '../utils/importExport';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

type Step = 'menu' | 'importing' | 'confirm' | 'success' | 'error';

export function ImportExportModal({ isOpen, onClose, onImportComplete }: ImportExportModalProps) {
  const [step, setStep] = useState<Step>('menu');
  const [importData, setImportData] = useState<AppData | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    downloadExport();
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStep('importing');
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const validation = validateImportData(content);
      
      if (!validation.valid || !validation.data) {
        setErrorMessage(validation.error || '未知错误');
        setStep('error');
        return;
      }

      setImportData(validation.data);
      setPreview(getImportPreview(validation.data));
      setStep('confirm');
    };

    reader.onerror = () => {
      setErrorMessage('文件读取失败');
      setStep('error');
    };

    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!importData) return;
    
    mergeImportData(importData, overwriteExisting);
    setStep('success');
  };

  const handleComplete = () => {
    onImportComplete();
    onClose();
    resetState();
  };

  const resetState = () => {
    setStep('menu');
    setImportData(null);
    setPreview(null);
    setErrorMessage('');
    setOverwriteExisting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(resetState, 200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-sage-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-cream-50 rounded-2xl shadow-xl w-full max-w-md animate-fade-in overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-sage-100">
          <h2 className="text-xl font-serif text-sage-800">数据管理</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-sage-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-sage-500" />
          </button>
        </div>

        <div className="p-6">
          {step === 'menu' && (
            <div className="space-y-4">
              <p className="text-sage-500 text-sm mb-6">
                导出数据以备份或迁移到其他设备，导入数据以恢复备份。
              </p>
              
              <button
                onClick={handleExport}
                className="w-full flex items-center gap-4 p-4 bg-sage-500 text-white rounded-xl hover:bg-sage-600 transition-colors"
              >
                <Download className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-medium">导出数据</div>
                  <div className="text-sm text-sage-100">下载所有植物和记录为 JSON 文件</div>
                </div>
              </button>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-4 p-4 bg-white border-2 border-dashed border-sage-200 text-sage-700 rounded-xl hover:bg-sage-50 hover:border-sage-300 transition-colors"
                >
                  <Upload className="w-6 h-6" />
                  <div className="text-left">
                    <div className="font-medium">导入数据</div>
                    <div className="text-sm text-sage-500">从备份文件恢复植物和记录</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Database className="w-8 h-8 text-sage-500" />
              </div>
              <p className="text-sage-600">正在解析文件...</p>
            </div>
          )}

          {step === 'confirm' && preview && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 p-4 bg-sage-50 rounded-xl">
                <CheckCircle className="w-6 h-6 text-sage-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-sage-800 mb-1">文件验证成功</h3>
                  <p className="text-sm text-sage-500">
                    包含 {importData?.plants.length || 0} 个植物，{importData?.records.length || 0} 条记录，{(importData?.careSkips || []).length} 条跳过记录
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-sage-700">导入预览</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {preview.newPlants.length}
                    </div>
                    <div className="text-xs text-green-600">新增植物</div>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-amber-600">
                      {preview.existingPlants.length}
                    </div>
                    <div className="text-xs text-amber-600">已存在植物</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {preview.newRecords.length}
                    </div>
                    <div className="text-xs text-blue-600">新增记录</div>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {preview.existingRecords.length}
                    </div>
                    <div className="text-xs text-orange-600">已存在记录</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {preview.newCareSkips.length}
                    </div>
                    <div className="text-xs text-purple-600">新增跳过</div>
                  </div>
                  <div className="bg-pink-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-pink-600">
                      {preview.existingCareSkips.length}
                    </div>
                    <div className="text-xs text-pink-600">已存在跳过</div>
                  </div>
                </div>
              </div>

              {preview.existingPlants.length + preview.existingRecords.length + preview.existingCareSkips.length > 0 && (
                <label className="flex items-start gap-3 p-3 bg-white rounded-lg border border-sage-200 cursor-pointer hover:bg-sage-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-sage-300 text-sage-500 focus:ring-sage-500"
                  />
                  <div>
                    <div className="font-medium text-sage-700 text-sm">覆盖已存在的数据</div>
                    <div className="text-xs text-sage-500 mt-0.5">
                      勾选后将用导入的数据覆盖同名 ID 的植物和记录
                    </div>
                  </div>
                </label>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2.5 border border-sage-200 text-sage-700 rounded-xl hover:bg-sage-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="flex-1 px-4 py-2.5 bg-sage-500 text-white rounded-xl hover:bg-sage-600 transition-colors"
                >
                  确认导入
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-lg font-medium text-sage-800 mb-2">导入成功</h3>
              <p className="text-sage-500 mb-6">数据已成功导入到您的植物日记中</p>
              <button
                onClick={handleComplete}
                className="px-6 py-2.5 bg-sage-500 text-white rounded-xl hover:bg-sage-600 transition-colors"
              >
                完成
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileWarning className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-lg font-medium text-sage-800 mb-2">导入失败</h3>
              <div className="flex items-start justify-center gap-2 mb-6">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-600 text-sm text-left">{errorMessage}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2.5 border border-sage-200 text-sage-700 rounded-xl hover:bg-sage-50 transition-colors"
                >
                  关闭
                </button>
                <button
                  onClick={() => {
                    resetState();
                    fileInputRef.current?.click();
                  }}
                  className="flex-1 px-4 py-2.5 bg-sage-500 text-white rounded-xl hover:bg-sage-600 transition-colors"
                >
                  重新选择
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Image as ImageIcon, Download, RefreshCw, ArrowLeft, Send, CheckCircle2, History, AlertCircle } from 'lucide-react';
import { AppStep, GeneratedResult } from './types';
import { quotaService } from './services/quotaService';
import { modifyImage } from './services/geminiService';
import { QuotaDisplay } from './components/QuotaDisplay';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [remainingQuota, setRemainingQuota] = useState(quotaService.getRemaining());
  const [history, setHistory] = useState<GeneratedResult[]>([]);
  const [lastRedoTime, setLastRedoTime] = useState(0);

  // Load history from local storage
  useEffect(() => {
    const saved = localStorage.getItem('enhancer_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved).slice(0, 10));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const saveToHistory = useCallback((newResult: GeneratedResult) => {
    setHistory(prev => {
      const updated = [newResult, ...prev].slice(0, 10);
      localStorage.setItem('enhancer_history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
        setStep(AppStep.DESCRIBE);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (remainingQuota <= 0) {
      alert("今日额度已用尽，请明天再来。");
      return;
    }
    
    // Check original image
    if (!originalImage) {
      alert("请先上传图片。");
      setStep(AppStep.UPLOAD);
      return;
    }

    // 10s cooling period check
    const now = Date.now();
    const timeSinceLast = now - lastRedoTime;
    if (timeSinceLast < 10000 && lastRedoTime !== 0) {
      const waitTime = Math.ceil((10000 - timeSinceLast) / 1000);
      alert(`操作频繁！请等待 ${waitTime} 秒后再试。`);
      return;
    }

    // Redo confirmation
    if (step === AppStep.GENERATE) {
      const confirmed = window.confirm(`重新生成将消耗 1 次额度，剩余 ${remainingQuota} 次。确定吗？`);
      if (!confirmed) return;
    }

    setIsGenerating(true);
    try {
      const images = await modifyImage(originalImage, prompt);
      
      if (images.length === 0) {
        alert("AI 未能生成有效的图像结果，请尝试修改您的描述词。");
        setIsGenerating(false);
        return;
      }

      // Update local quota state
      quotaService.useQuota();
      const newQuotaValue = quotaService.getRemaining();
      setRemainingQuota(newQuotaValue);
      setLastRedoTime(Date.now());

      setResults(images);
      setStep(AppStep.GENERATE);

      // Save to history
      const resultData: GeneratedResult = {
        id: Date.now().toString(),
        originalImage,
        prompt,
        results: images,
        timestamp: Date.now()
      };
      saveToHistory(resultData);
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
    } catch (error: any) {
      console.error("Generation process failed:", error);
      const msg = error?.message || "网络连接异常";
      alert(`生成失败: ${msg}\n请确认您的描述词或稍后重试。`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadAll = async () => {
    results.forEach((img, idx) => {
      const link = document.createElement('a');
      link.href = img;
      link.download = `gemini_enhanced_${idx + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center">
      {/* Navbar */}
      <nav className="w-full bg-white border-b border-slate-200 sticky top-0 z-30 py-4 px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
          <div className="p-2 bg-blue-600 rounded-lg text-white">
            <ImageIcon size={20} />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Gemini Enhancer
          </h1>
        </div>
        
        <QuotaDisplay remaining={remainingQuota} total={300} />
      </nav>

      {/* Main Content */}
      <main className="w-full max-w-5xl p-6 md:p-12 flex-grow">
        
        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-12 gap-2 md:gap-4 overflow-x-auto py-2 no-scrollbar">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${step >= s ? 'bg-blue-600 text-white scale-105 shadow-md' : 'bg-slate-200 text-slate-500'}`}>
                {step > s ? <CheckCircle2 size={16} /> : <span>{s}</span>}
                <span className="whitespace-nowrap">{s === 1 ? '上传图片' : s === 2 ? '编辑描述' : '生成结果'}</span>
              </div>
              {s < 3 && <div className={`w-8 md:w-16 h-0.5 transition-colors duration-500 ${step > s ? 'bg-blue-600' : 'bg-slate-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === AppStep.UPLOAD && (
          <div className="bg-white rounded-3xl p-12 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center group hover:border-blue-400 transition-all duration-300 shadow-sm hover:shadow-md">
            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
              <Upload className="text-blue-500" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">上传您的截图</h2>
            <p className="text-slate-500 mb-8 max-w-sm">支持 PNG, JPG。每张截图我们都会为您生成 4 种不同维度的增强版本。</p>
            <label className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl font-semibold cursor-pointer shadow-lg shadow-blue-100 transition-all active:scale-95 flex items-center gap-2">
              <Upload size={18} />
              选择文件
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
            <p className="mt-6 text-sm font-medium text-slate-400">每日免费额度：300次 (剩余：{remainingQuota}次)</p>
          </div>
        )}

        {/* Step 2: Describe */}
        {step === AppStep.DESCRIBE && originalImage && (
          <div className="grid md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
              <div className="relative group">
                <img src={originalImage} alt="Original" className="w-full rounded-2xl object-cover aspect-video shadow-inner" />
                <div className="absolute top-3 left-3 px-3 py-1 bg-black/50 backdrop-blur-md text-white text-xs rounded-full font-bold">原图</div>
              </div>
              <button 
                onClick={() => setStep(AppStep.UPLOAD)}
                className="mt-4 flex items-center gap-2 text-slate-500 hover:text-blue-600 font-medium text-sm transition-colors p-2"
              >
                <ArrowLeft size={16} /> 重新选择原图
              </button>
            </div>
            
            <div className="flex flex-col h-full bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-6">
                <h2 className="text-2xl font-bold text-slate-800">修改描述</h2>
                <div className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-md font-bold">AI 指令</div>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="例如：把背景改成未来都市，增加柔和的落日余晖，并将主体颜色调亮..."
                className="flex-grow w-full p-5 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none resize-none transition-all leading-relaxed text-slate-700"
              />
              <div className="mt-8 flex flex-col gap-4">
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating || remainingQuota <= 0}
                  className="w-full bg-blue-600 disabled:bg-slate-400 hover:bg-blue-700 text-white px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-200 transition-all active:scale-95"
                >
                  {isGenerating ? <RefreshCw className="animate-spin" size={20} /> : <Send size={20} />}
                  {isGenerating ? '正在深度处理...' : '开始生成 (消耗1次额度)'}
                </button>
                <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                   <AlertCircle size={14} />
                   <span>每次生成将提供 4 张不同维度的结果</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === AppStep.GENERATE && results.length > 0 && (
          <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-wrap items-center justify-between gap-4 glass-effect p-6 rounded-3xl sticky top-24 z-20 shadow-lg border border-white/50">
               <div className="flex gap-3">
                <button 
                  onClick={() => setStep(AppStep.DESCRIBE)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
                >
                  <ArrowLeft size={18} /> 返回修改
                </button>
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || remainingQuota <= 0}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95 ${
                    remainingQuota > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <RefreshCw className={isGenerating ? "animate-spin" : ""} size={18} /> 
                  Redo (消耗1次额度)
                </button>
              </div>
              
              <button 
                onClick={handleDownloadAll}
                className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 active:scale-95"
              >
                <Download size={18} /> 一键下载 (PNG)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {results.map((img, idx) => (
                <div key={`${idx}-${lastRedoTime}`} className="group relative bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-100">
                  <div className="aspect-video overflow-hidden">
                    <img src={img} alt={`Result ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-1 block">维度 {idx + 1}</span>
                        <h4 className="text-white font-bold text-lg leading-tight">
                          {idx === 0 ? '基础修改 (视角不变)' : idx === 1 ? '视角调整 (30°偏移)' : idx === 2 ? '场景替换 (环境重构)' : '综合调整 (多维变换)'}
                        </h4>
                      </div>
                      <button 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = img;
                          link.download = `gemini_variant_${idx+1}.png`;
                          link.click();
                        }}
                        className="p-3 bg-white/20 backdrop-blur-md hover:bg-white/40 text-white rounded-xl transition-colors"
                      >
                        <Download size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="absolute top-6 right-6 flex items-center justify-center w-10 h-10 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl text-sm font-black text-blue-600">
                    {idx + 1}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-indigo-50 border border-indigo-100 p-8 rounded-[2rem] text-center max-w-2xl mx-auto shadow-inner">
               <p className="text-indigo-900 font-semibold mb-1">💡 专家建议</p>
               <p className="text-indigo-700/80 text-sm">每次 Redo 都会基于您的指令重新生成 4 张全新效果。如果对当前结果满意，请及时下载。</p>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isGenerating && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="relative p-12 bg-white rounded-3xl shadow-2xl flex flex-col items-center max-w-sm text-center">
              <div className="relative mb-8">
                <div className="w-24 h-24 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                <ImageIcon className="absolute inset-0 m-auto text-blue-600 animate-pulse" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">AI 正在深度重构</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                正在同步生成 4 种不同维度的视觉增强方案，这通常需要 10-20 秒，请保持耐心...
              </p>
              <div className="mt-8 flex gap-1 justify-center">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* History Section */}
      {history.length > 0 && (
        <section className="w-full max-w-5xl px-6 md:px-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-slate-200 rounded-lg">
                <History size={18} className="text-slate-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">历史创作</h2>
            </div>
            <button 
              onClick={() => {
                if(confirm("确定要清空历史记录吗？")) {
                  localStorage.removeItem('enhancer_history');
                  setHistory([]);
                }
              }}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              清空记录
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
            {history.map((h) => (
              <button 
                key={h.id}
                onClick={() => {
                  setOriginalImage(h.originalImage);
                  setPrompt(h.prompt);
                  setResults(h.results);
                  setStep(AppStep.GENERATE);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="group relative rounded-2xl overflow-hidden aspect-video shadow-md border border-white hover:border-blue-400 transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <img src={h.results[0]} alt="History Item" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 text-left">
                  <span className="text-[10px] text-blue-300 font-bold uppercase">查看结果</span>
                  <p className="text-white text-[10px] line-clamp-1 font-medium">{h.prompt}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="w-full py-12 text-center border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>系统状态：正常运行</span>
          </div>
          <p className="text-slate-400 text-sm">© 2024 Gemini Image Enhancer. 每日 0 点重置额度</p>
          <div className="flex gap-6 text-xs font-medium text-slate-500">
            <a href="#" className="hover:text-blue-600 transition-colors">隐私政策</a>
            <a href="#" className="hover:text-blue-600 transition-colors">使用条款</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

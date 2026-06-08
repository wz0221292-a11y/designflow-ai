'use client';

import { useState } from 'react';

interface TestResult {
  service: string;
  success: boolean;
  imageUrl?: string;
  error?: string;
  time?: number;
}

export default function TestImageAPIPage() {
  const [prompt, setPrompt] = useState('一个现代简约的智能音箱，白色，产品摄影风格');
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const testPollinations = async (): Promise<TestResult> => {
    const start = Date.now();
    addLog('开始测试 Pollinations.ai (Flux)...');
    try {
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${Date.now()}&model=flux&nologo=true`;

      addLog(`请求 URL: ${imageUrl.substring(0, 100)}...`);

      const response = await fetch(imageUrl, { method: 'HEAD' });
      addLog(`HEAD 响应状态: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          addLog('图片加载成功');
          resolve(true);
        };
        img.onerror = (e) => {
          addLog(`图片加载失败: ${JSON.stringify(e)}`);
          reject(new Error('图片加载失败，可能被阻止'));
        };
        img.src = imageUrl;
      });

      return {
        service: 'Pollinations.ai (Flux)',
        success: true,
        imageUrl,
        time: Date.now() - start,
      };
    } catch (error: any) {
      addLog(`测试失败: ${error.message}`);
      return {
        service: 'Pollinations.ai (Flux)',
        success: false,
        error: error.message || '未知错误',
        time: Date.now() - start,
      };
    }
  };

  const testPollinationsSDXL = async (): Promise<TestResult> => {
    const start = Date.now();
    addLog('开始测试 Pollinations.ai (SDXL)...');
    try {
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${Date.now()}&model=sdxl&nologo=true`;

      addLog(`请求 URL: ${imageUrl.substring(0, 100)}...`);

      const response = await fetch(imageUrl, { method: 'HEAD' });
      addLog(`HEAD 响应状态: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          addLog('图片加载成功');
          resolve(true);
        };
        img.onerror = (e) => {
          addLog(`图片加载失败: ${JSON.stringify(e)}`);
          reject(new Error('图片加载失败，可能被阻止'));
        };
        img.src = imageUrl;
      });

      return {
        service: 'Pollinations.ai (SDXL)',
        success: true,
        imageUrl,
        time: Date.now() - start,
      };
    } catch (error: any) {
      addLog(`测试失败: ${error.message}`);
      return {
        service: 'Pollinations.ai (SDXL)',
        success: false,
        error: error.message || '未知错误',
        time: Date.now() - start,
      };
    }
  };

  const testReplicate = async (): Promise<TestResult> => {
    const start = Date.now();
    addLog('开始测试 Replicate API...');
    try {
      addLog('发送 POST 请求到 /api/image');

      const response = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'appearance',
          prompt: prompt,
        }),
      });

      const data = await response.json();
      addLog(`响应状态: ${response.status}, 数据: ${JSON.stringify(data).substring(0, 200)}`);

      if (!response.ok) {
        return {
          service: 'Replicate API',
          success: false,
          error: data.error || '请求失败',
          time: Date.now() - start,
        };
      }

      return {
        service: 'Replicate API',
        success: true,
        imageUrl: data.imageUrl,
        time: Date.now() - start,
      };
    } catch (error: any) {
      addLog(`测试失败: ${error.message}`);
      return {
        service: 'Replicate API',
        success: false,
        error: error.message,
        time: Date.now() - start,
      };
    }
  };

  const testDirectReplicate = async (): Promise<TestResult> => {
    const start = Date.now();
    addLog('开始测试 Replicate 直接调用...');
    try {
      const response = await fetch('/api/test-replicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
        }),
      });

      const data = await response.json();
      addLog(`响应: ${JSON.stringify(data).substring(0, 200)}`);

      if (!response.ok) {
        return {
          service: 'Replicate 直接调用',
          success: false,
          error: data.error || '请求失败',
          time: Date.now() - start,
        };
      }

      return {
        service: 'Replicate 直接调用',
        success: true,
        imageUrl: data.imageUrl,
        time: Date.now() - start,
      };
    } catch (error: any) {
      addLog(`测试失败: ${error.message}`);
      return {
        service: 'Replicate 直接调用',
        success: false,
        error: error.message,
        time: Date.now() - start,
      };
    }
  };

  const testPollinationsDirect = async (): Promise<TestResult> => {
    const start = Date.now();
    addLog('开始测试 Pollinations 直接调用...');
    try {
      const response = await fetch('/api/pollinations-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      addLog(`响应状态: ${response.status}, 数据: ${JSON.stringify(data).substring(0, 200)}`);

      if (!response.ok) {
        return {
          service: 'Pollinations 直接调用',
          success: false,
          error: data.error || '请求失败',
          time: Date.now() - start,
        };
      }

      return {
        service: 'Pollinations 直接调用',
        success: true,
        imageUrl: data.imageUrl,
        time: Date.now() - start,
      };
    } catch (error: any) {
      addLog(`测试失败: ${error.message}`);
      return {
        service: 'Pollinations 直接调用',
        success: false,
        error: error.message,
        time: Date.now() - start,
      };
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults([]);
    setLogs([]);
    addLog('开始运行所有测试...');

    const tests = [
      testPollinations,
      testPollinationsSDXL,
      testPollinationsDirect,
      testReplicate,
      testDirectReplicate,
    ];

    for (const test of tests) {
      const result = await test();
      setResults(prev => [...prev, result]);
    }

    addLog('所有测试完成');
    setTesting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI 生图 API 测试</h1>
        <p className="text-gray-600 mb-8">测试不同 AI 生图服务的可用性和速度</p>

        {/* 输入区域 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            测试提示词
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-24 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-gray-900"
            placeholder="输入图片生成提示词..."
          />

          <div className="mt-4 flex gap-3">
            <button
              onClick={runAllTests}
              disabled={testing}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
            >
              {testing ? '测试中...' : '运行所有测试'}
            </button>
            <button
              onClick={() => setPrompt('一个现代简约的智能音箱，白色，产品摄影风格')}
              className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg"
            >
              示例提示词
            </button>
          </div>
        </div>

        {/* 日志区域 */}
        {logs.length > 0 && (
          <div className="bg-gray-900 text-green-400 rounded-lg p-4 mb-6 font-mono text-sm max-h-64 overflow-y-auto">
            <h3 className="text-white font-semibold mb-2">📋 调试日志</h3>
            {logs.map((log, i) => (
              <div key={i} className="mb-1">
                {log}
              </div>
            ))}
          </div>
        )}

        {/* 结果展示 */}
        {results.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">测试结果</h2>

            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{result.service}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {result.success ? '✅ 成功' : `❌ 失败: ${result.error}`}
                        {result.time && ` · ${result.time}ms`}
                      </p>
                    </div>
                  </div>

                  {result.success && result.imageUrl && (
                    <div className="mt-3">
                      <img
                        src={result.imageUrl}
                        alt={`${result.service} 生成的图片`}
                        className="w-full max-w-md h-48 object-cover rounded-lg"
                      />
                      <a
                        href={result.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                      >
                        查看原图 →
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 说明 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">💡 说明</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Pollinations.ai</strong> - 完全免费，无需 API key，支持 Flux 和 SDXL 模型</li>
            <li>• <strong>Replicate API</strong> - 需要配置 REPLICATE_API_TOKEN，按量付费</li>
            <li>• <strong>Replicate 直接调用</strong> - 测试 Replicate API 的直接调用</li>
            <li>• 测试会按顺序运行，每个服务生成一张图片</li>
            <li>• 如果全部失败，请检查网络或考虑使用国内 API 服务</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

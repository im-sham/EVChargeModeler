import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import * as math from 'mathjs'; // Import mathjs properly

const App: React.FC = () => {
  const [inputs, setInputs] = useState({
    chargers: 4,
    capEx: 100000,
    opEx: 0.1,
    revenuePerKWh: 0.4,
    utilization: 0.5,
    horizon: 10,
    discountRate: 0.08,
    lcfsCreditValue: 150,
  });
  const [npv, setNpv] = useState(0);
  const [cashFlows, setCashFlows] = useState<number[]>([]);
  const [sowExpenses, setSowExpenses] = useState<string[]>([]);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    const annualKWh = inputs.chargers * inputs.utilization * 365 * 1000;
    const lcfsCredits = (annualKWh * 3.6 * 0.6) / 1000000;
    const flows: number[] = [];
    for (let t = 0; t < inputs.horizon; t++) {
      const revenue = (annualKWh * inputs.revenuePerKWh) + (lcfsCredits * inputs.lcfsCreditValue);
      const costs = (inputs.capEx * inputs.chargers) * inputs.opEx;
      flows.push(revenue - costs);
    }
    const initialInvestment = inputs.capEx * inputs.chargers;
    const calculatedNpv = math.npv(flows, inputs.discountRate) - initialInvestment; // Use imported math
    setCashFlows(flows);
    setNpv(calculatedNpv);

    if (chartInstance.current) chartInstance.current.destroy();
    if (chartRef.current) {
      chartInstance.current = new Chart(chartRef.current, {
        type: 'line',
        data: { labels: Array.from({ length: inputs.horizon }, (_, i) => `Year ${i + 1}`), datasets: [{ label: 'Annual Cash Flow ($)', data: flows, borderColor: '#4B5EAA', backgroundColor: 'rgba(75, 94, 170, 0.2)', fill: true }] },
        options: { responsive: true, scales: { y: { beginAtZero: false } } },
      });
    }
  }, [inputs]);

  const handleInputChange = (key: string, value: number) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const handleSowUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      const response = await fetch('/api/upload-sow', { method: 'POST', body: formData }); // Proxy to /api
      const data = await response.json();
      setSowExpenses(data.expenses || []);
    } catch (error) {
      alert('Upload failed: ' + (error as Error).message);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-600">EVChargeModeler</h1>
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Project Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(inputs).map(([key, value]) => (
            <div key={key}>
              <label className="block text-sm font-medium mb-1">
                {key === 'chargers' ? 'Chargers (4-8):' : key === 'capEx' ? 'CapEx ($/charger):' : key === 'opEx' ? 'OpEx (% of CapEx):' : key === 'revenuePerKWh' ? 'Revenue ($/kWh):' : key === 'utilization' ? 'Utilization (%):' : key === 'horizon' ? 'Horizon (years):' : key === 'discountRate' ? 'Discount Rate (%):' : 'LCFS Credit Value ($/credit):'}
              </label>
              <input
                type="number"
                value={['opEx', 'utilization', 'discountRate'].includes(key) ? value * 100 : value}
                onChange={(e) => handleInputChange(key, ['opEx', 'utilization', 'discountRate'].includes(key) ? Number(e.target.value) / 100 : Number(e.target.value))}
                className="w-full border border-gray-300 p-2 rounded"
                min={key === 'chargers' ? 4 : undefined}
                max={key === 'chargers' ? 8 : undefined}
                step={['opEx', 'discountRate'].includes(key) ? 0.1 : key === 'revenuePerKWh' ? 0.01 : 1}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Financial Outputs</h2>
        <p className="text-lg mb-2">NPV: <span className={npv >= 0 ? 'text-green-600' : 'text-red-600'}>{npv.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span></p>
        <p className="text-sm text-gray-600">Levelized Cost of Charging (LCOC): ~${((inputs.capEx * inputs.chargers * inputs.opEx) / (inputs.chargers * inputs.utilization * 365 * 1000)).toFixed(2)}/kWh (approx., post-incentives)</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Cash Flow Over Time</h2>
        <canvas ref={chartRef} className="w-full h-64"></canvas>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Upload SOW for Comparison</h2>
        <form onSubmit={handleSowUpload} encType="multipart/form-data" className="space-y-4">
          <input type="file" name="file" accept=".pdf,.xlsx,.docx" className="w-full border border-gray-300 p-2 rounded" required />
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Upload & Parse Expenses</button>
        </form>
        {sowExpenses.length > 0 && (
          <div className="mt-4 p-4 bg-green-100 rounded">
            <p>Parsed Expenses: {sowExpenses.join(', ')}</p>
            <p className="text-sm text-gray-600">Layer these into your model for CapEx overrides.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
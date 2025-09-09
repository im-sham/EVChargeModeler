import { useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface CashFlowChartProps {
  cashFlows: any;
}

export function CashFlowChart({ cashFlows }: CashFlowChartProps) {
  const generateCashFlowData = () => {
    // If we have actual cash flows from DCF calculation, use them
    if (cashFlows && Array.isArray(cashFlows)) {
      return {
        labels: cashFlows.map((_, index) => `Year ${index + 1}`),
        datasets: [{
          label: 'Net Cash Flow ($K)',
          data: cashFlows.map((cf: number) => cf / 1000), // Convert to thousands
          backgroundColor: (ctx: any) => {
            return ctx.parsed.y >= 0 ? 'hsl(34, 197, 94)' : 'hsl(239, 68, 68)';
          },
          borderRadius: 4,
        }]
      };
    }

    // Fallback example data
    const labels = Array.from({ length: 10 }, (_, i) => `Year ${i + 1}`);
    const data = [-1200, 180, 250, 320, 380, 420, 450, 480, 510, 540];

    return {
      labels,
      datasets: [{
        label: 'Net Cash Flow ($K)',
        data,
        backgroundColor: (ctx: any) => {
          return ctx.parsed.y >= 0 ? 'hsl(34, 197, 94)' : 'hsl(239, 68, 68)';
        },
        borderRadius: 4,
      }]
    };
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.y;
            return `Cash Flow: ${value >= 0 ? '+' : ''}$${value}K`;
          },
        },
      },
    },
    scales: {
      y: {
        grid: {
          color: 'hsl(226, 232, 240)',
        },
        ticks: {
          callback: (value: any) => `$${value}K`,
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  const data = generateCashFlowData();

  return (
    <div className="w-full h-full">
      <Bar data={data} options={options} />
    </div>
  );
}

import { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { Project } from "@shared/schema";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PortfolioChartProps {
  projects: Project[];
}

export function PortfolioChart({ projects }: PortfolioChartProps) {
  // Generate monthly portfolio performance data
  const generatePortfolioData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    if (projects.length === 0) {
      return {
        labels: months,
        datasets: [{
          label: 'Average NPV ($M)',
          data: [0, 0, 0, 0, 0, 0],
          borderColor: 'hsl(34, 197, 94)',
          backgroundColor: 'hsla(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.4,
        }]
      };
    }

    // Calculate average NPV for the portfolio
    const avgNPV = projects.reduce((sum, p) => sum + (parseFloat(p.npv || "0")), 0) / projects.length;
    const baseValue = avgNPV / 1000000; // Convert to millions

    // Generate some variation around the average
    const data = months.map((_, index) => {
      const variation = (Math.random() - 0.5) * 0.5; // ±0.25M variation
      return Math.max(0, baseValue + variation);
    });

    return {
      labels: months,
      datasets: [{
        label: 'Average NPV ($M)',
        data,
        borderColor: 'hsl(34, 197, 94)',
        backgroundColor: 'hsla(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
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
            return `NPV: $${context.parsed.y.toFixed(1)}M`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'hsl(226, 232, 240)',
        },
        ticks: {
          callback: (value: any) => `$${value}M`,
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  const data = generatePortfolioData();

  return (
    <div className="w-full h-full">
      <Line data={data} options={options} />
    </div>
  );
}

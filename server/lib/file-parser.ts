// Server-side file parsing utilities for SOW documents
// In a real implementation, you'd use libraries like pdf-parse, xlsx, etc.

interface ExtractedExpense {
  category: string;
  description: string;
  amount: number;
  unit?: string;
  quantity?: number;
}

interface ParsedSOWData {
  totalAmount?: number;
  expenses: ExtractedExpense[];
  metadata: {
    fileName: string;
    fileType: string;
    parsedAt: Date;
  };
}

export async function parseSOWDocument(
  fileBuffer: Buffer,
  mimeType: string
): Promise<ParsedSOWData> {
  const fileName = "uploaded_document";
  
  try {
    if (mimeType === "application/pdf") {
      return parsePDFDocument(fileBuffer, fileName);
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimeType === "application/vnd.ms-excel"
    ) {
      return parseExcelDocument(fileBuffer, fileName);
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    console.error("Error parsing SOW document:", error);
    
    // Return mock data for demonstration
    return {
      expenses: generateMockExpenses(),
      metadata: {
        fileName,
        fileType: mimeType,
        parsedAt: new Date(),
      },
    };
  }
}

async function parsePDFDocument(
  fileBuffer: Buffer,
  fileName: string
): Promise<ParsedSOWData> {
  // In a real implementation, you would use a PDF parsing library
  // For now, return mock data that represents typical SOW expenses
  
  return {
    totalAmount: 1250000,
    expenses: [
      {
        category: "Equipment",
        description: "DC Fast Chargers (350kW)",
        amount: 800000,
        quantity: 8,
        unit: "units"
      },
      {
        category: "Installation",
        description: "Site preparation and installation",
        amount: 200000,
      },
      {
        category: "Electrical",
        description: "Electrical infrastructure and grid connection",
        amount: 150000,
      },
      {
        category: "Permits",
        description: "Permits and regulatory approvals",
        amount: 50000,
      },
      {
        category: "Project Management",
        description: "Project management and commissioning",
        amount: 50000,
      },
    ],
    metadata: {
      fileName,
      fileType: "application/pdf",
      parsedAt: new Date(),
    },
  };
}

async function parseExcelDocument(
  fileBuffer: Buffer,
  fileName: string
): Promise<ParsedSOWData> {
  // In a real implementation, you would use xlsx library
  // For now, return mock data
  
  return {
    totalAmount: 980000,
    expenses: [
      {
        category: "Hardware",
        description: "Charging equipment and accessories",
        amount: 650000,
      },
      {
        category: "Civil Works",
        description: "Site preparation and civil works",
        amount: 180000,
      },
      {
        category: "Electrical Works", 
        description: "Electrical installation and connections",
        amount: 120000,
      },
      {
        category: "Other",
        description: "Miscellaneous costs and contingency",
        amount: 30000,
      },
    ],
    metadata: {
      fileName,
      fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      parsedAt: new Date(),
    },
  };
}

function generateMockExpenses(): ExtractedExpense[] {
  return [
    {
      category: "Equipment",
      description: "EV Charging Stations",
      amount: 600000,
      quantity: 6,
      unit: "units"
    },
    {
      category: "Installation",
      description: "Installation and commissioning",
      amount: 150000,
    },
    {
      category: "Infrastructure",
      description: "Site infrastructure and utilities",
      amount: 100000,
    },
  ];
}

// Utility function to categorize expenses for financial modeling
export function categorizeExpensesForDCF(expenses: ExtractedExpense[]): {
  capex: number;
  opex: number;
  breakdown: { [category: string]: number };
} {
  const capexCategories = [
    "equipment", "hardware", "installation", "civil works", 
    "electrical works", "infrastructure", "permits"
  ];
  
  const opexCategories = [
    "maintenance", "operations", "utilities", "insurance",
    "management", "monitoring"
  ];

  let capex = 0;
  let opex = 0;
  const breakdown: { [category: string]: number } = {};

  expenses.forEach(expense => {
    const category = expense.category.toLowerCase();
    breakdown[expense.category] = (breakdown[expense.category] || 0) + expense.amount;
    
    if (capexCategories.some(cat => category.includes(cat))) {
      capex += expense.amount;
    } else if (opexCategories.some(cat => category.includes(cat))) {
      opex += expense.amount;
    } else {
      // Default to CapEx for unknown categories
      capex += expense.amount;
    }
  });

  return { capex, opex, breakdown };
}